import { prisma } from "./db";
import { REWARDS } from "./constants";
import {
  generateDashboardToken,
  generateReferralCode,
  referralLink,
} from "./codes";
import { buildIntegrityHash, hashIp } from "./hash";
import { publishEvent } from "./events";
import { resolveGeo, extractClientIp, type GeoResult } from "./geo";
import { sendWelcomeEmail } from "./email";
import { milestoneProgress } from "./milestones";

export class WaitlistError extends Error {
  constructor(
    message: string,
    public code:
      | "DUPLICATE_EMAIL"
      | "SELF_REFERRAL"
      | "INVALID_REFERRAL"
      | "NOT_FOUND"
      | "PROFILE_INCOMPLETE"
      | "ALREADY_COMPLETED",
  ) {
    super(message);
    this.name = "WaitlistError";
  }
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode();
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  return `${generateReferralCode()}${Date.now().toString(36).slice(-2)}`.slice(0, 10);
}

export async function signupUser(input: {
  email: string;
  referralCode?: string | null;
  headers?: Headers;
  simulate?: boolean;
  simulateGeo?: Partial<GeoResult>;
}) {
  const email = input.email.toLowerCase().trim();
  if (!email || !email.includes("@")) {
    throw new WaitlistError("Valid email required", "NOT_FOUND");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    publishEvent({
      type: "fraud_blocked",
      message: `Duplicate email blocked: ${email}`,
      sql: `-- REJECTED: UNIQUE(email) violation for '${email}'`,
      data: { email, reason: "DUPLICATE_EMAIL" },
    });
    throw new WaitlistError("Email already registered", "DUPLICATE_EMAIL");
  }

  let referrer: { id: string; email: string; referralCode: string } | null = null;
  if (input.referralCode) {
    referrer = await prisma.user.findUnique({
      where: { referralCode: input.referralCode.toUpperCase() },
      select: { id: true, email: true, referralCode: true },
    });
    if (!referrer) {
      throw new WaitlistError("Invalid referral code", "INVALID_REFERRAL");
    }
    if (referrer.email === email) {
      publishEvent({
        type: "fraud_blocked",
        message: "Self-referral blocked",
        sql: `-- REJECTED: self-referral for ${email}`,
        data: { reason: "SELF_REFERRAL" },
      });
      throw new WaitlistError("Self-referral is not allowed", "SELF_REFERRAL");
    }
  }

  const ip = input.headers
    ? extractClientIp(input.headers)
    : input.simulate
      ? `203.0.113.${Math.floor(Math.random() * 200) + 1}`
      : "127.0.0.1";

  const geo =
    input.simulateGeo != null
      ? {
          city: input.simulateGeo.city ?? "Austin",
          region: input.simulateGeo.region ?? "Texas",
          country: input.simulateGeo.country ?? "United States",
          ip,
          source: "mock" as const,
        }
      : await resolveGeo(ip, { forceMock: Boolean(input.simulate) });

  publishEvent({
    type: "geo",
    message: `Location captured: ${geo.city}, ${geo.region}, ${geo.country} (${geo.source})`,
    sql: `-- geo lookup ip=${geo.ip} source=${geo.source}`,
    data: { ...geo },
  });

  const referralCode = await uniqueReferralCode();
  const dashboardToken = generateDashboardToken();

  const user = await prisma.user.create({
    data: {
      email,
      referralCode,
      dashboardToken,
      referredById: referrer?.id,
      coinsBalance: REWARDS.SIGNUP_COINS,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      ipHash: hashIp(geo.ip),
    },
  });

  publishEvent({
    type: "user_created",
    message: `User created: ${email} (+${REWARDS.SIGNUP_COINS} coins, code ${referralCode})`,
    sql: `INSERT INTO User (email, referralCode, coinsBalance) VALUES ('${email}', '${referralCode}', ${REWARDS.SIGNUP_COINS});`,
    data: {
      userId: user.id,
      email,
      referralCode,
      coins: REWARDS.SIGNUP_COINS,
    },
  });

  await prisma.rewardLedger.create({
    data: {
      userId: user.id,
      type: "signup",
      amountCoins: REWARDS.SIGNUP_COINS,
      amountCents: 0,
      idempotencyKey: `signup:${user.id}`,
      meta: JSON.stringify({ source: input.simulate ? "demo" : "organic" }),
    },
  });

  publishEvent({
    type: "reward_credited",
    message: `Ledger: signup +${REWARDS.SIGNUP_COINS} coins`,
    sql: `INSERT INTO RewardLedger (userId, type, amountCoins, idempotencyKey) VALUES ('${user.id}', 'signup', ${REWARDS.SIGNUP_COINS}, 'signup:${user.id}');`,
    data: { userId: user.id, type: "signup", amountCoins: REWARDS.SIGNUP_COINS },
  });

  if (referrer) {
    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: user.id,
        status: "converted",
        coinsAwarded: REWARDS.REFERRAL_COINS,
        cashAwardedCents: REWARDS.REFERRAL_CASH_CENTS,
        convertedAt: new Date(),
      },
    });

    publishEvent({
      type: "referral_linked",
      message: `Referral linked: ${referrer.referralCode} → ${email}`,
      sql: `INSERT INTO Referral (referrerId, refereeId, status, coinsAwarded, cashAwardedCents) VALUES ('${referrer.id}', '${user.id}', 'converted', ${REWARDS.REFERRAL_COINS}, ${REWARDS.REFERRAL_CASH_CENTS});`,
      data: {
        referralId: referral.id,
        referrerId: referrer.id,
        refereeId: user.id,
      },
    });

    // Coins for referrer (idempotent per referee)
    try {
      await prisma.rewardLedger.create({
        data: {
          userId: referrer.id,
          type: "referral_coins",
          amountCoins: REWARDS.REFERRAL_COINS,
          amountCents: 0,
          idempotencyKey: `referral_coins:${user.id}`,
          meta: JSON.stringify({ refereeId: user.id, referralId: referral.id }),
        },
      });
      await prisma.user.update({
        where: { id: referrer.id },
        data: { coinsBalance: { increment: REWARDS.REFERRAL_COINS } },
      });
      publishEvent({
        type: "reward_credited",
        message: `Referrer +${REWARDS.REFERRAL_COINS} coins`,
        sql: `UPDATE User SET coinsBalance = coinsBalance + ${REWARDS.REFERRAL_COINS} WHERE id='${referrer.id}';`,
        data: {
          userId: referrer.id,
          type: "referral_coins",
          amountCoins: REWARDS.REFERRAL_COINS,
        },
      });
    } catch {
      publishEvent({
        type: "fraud_blocked",
        message: "Duplicate referral coin credit blocked by idempotency key",
        data: { reason: "IDEMPOTENCY", key: `referral_coins:${user.id}` },
      });
    }

    try {
      await prisma.rewardLedger.create({
        data: {
          userId: referrer.id,
          type: "referral_cash",
          amountCoins: 0,
          amountCents: REWARDS.REFERRAL_CASH_CENTS,
          idempotencyKey: `referral_cash:${user.id}`,
          meta: JSON.stringify({ refereeId: user.id, referralId: referral.id }),
        },
      });
      await prisma.user.update({
        where: { id: referrer.id },
        data: { cashEarnedCents: { increment: REWARDS.REFERRAL_CASH_CENTS } },
      });
      publishEvent({
        type: "reward_credited",
        message: `Referrer +$${REWARDS.REFERRAL_CASH_CENTS / 100} cash`,
        sql: `UPDATE User SET cashEarnedCents = cashEarnedCents + ${REWARDS.REFERRAL_CASH_CENTS} WHERE id='${referrer.id}';`,
        data: {
          userId: referrer.id,
          type: "referral_cash",
          amountCents: REWARDS.REFERRAL_CASH_CENTS,
        },
      });
    } catch {
      publishEvent({
        type: "fraud_blocked",
        message: "Duplicate referral cash credit blocked by idempotency key",
        data: { reason: "IDEMPOTENCY", key: `referral_cash:${user.id}` },
      });
    }
  }

  // Integrity hash chain
  const prev = await prisma.integrityNode.findFirst({
    orderBy: { createdAt: "desc" },
  });
  const timestamp = new Date().toISOString();
  const prevHash = prev?.nodeHash ?? "GENESIS";
  const nodeHash = buildIntegrityHash({
    userId: user.id,
    referrerId: referrer?.id ?? null,
    email,
    timestamp,
    prevHash,
  });

  const node = await prisma.integrityNode.create({
    data: {
      userId: user.id,
      parentUserId: referrer?.id ?? null,
      nodeHash,
      prevHash,
    },
  });

  publishEvent({
    type: "integrity_node",
    message: `Integrity node ${nodeHash.slice(0, 12)}… (prev ${prevHash.slice(0, 8)}…)`,
    sql: `INSERT INTO IntegrityNode (userId, parentUserId, nodeHash, prevHash) VALUES ('${user.id}', ${referrer ? `'${referrer.id}'` : "NULL"}, '${nodeHash}', '${prevHash}');`,
    data: {
      nodeId: node.id,
      nodeHash,
      prevHash,
      parentUserId: referrer?.id ?? null,
    },
  });

  const emailResult = await sendWelcomeEmail({
    userId: user.id,
    email,
    referralCode,
    dashboardToken,
    coins: REWARDS.SIGNUP_COINS,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      referralCode: user.referralCode,
      referralLink: referralLink(user.referralCode),
      coinsBalance: user.coinsBalance,
      cashEarnedCents: user.cashEarnedCents,
      dashboardToken: user.dashboardToken,
      city: user.city,
      region: user.region,
      country: user.country,
      createdAt: user.createdAt,
    },
    referrer: referrer
      ? { id: referrer.id, referralCode: referrer.referralCode }
      : null,
    email: emailResult,
    integrity: { nodeHash, prevHash },
  };
}

export async function completeProfile(input: {
  userId?: string;
  dashboardToken?: string;
  fullName: string;
  phone: string;
}) {
  const user = input.userId
    ? await prisma.user.findUnique({ where: { id: input.userId } })
    : input.dashboardToken
      ? await prisma.user.findUnique({
          where: { dashboardToken: input.dashboardToken },
        })
      : null;

  if (!user) throw new WaitlistError("User not found", "NOT_FOUND");

  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  if (!fullName || !phone) {
    throw new WaitlistError(
      "Full name and phone are required",
      "PROFILE_INCOMPLETE",
    );
  }

  if (user.profileCompletedAt) {
    publishEvent({
      type: "fraud_blocked",
      message: `Profile bonus already granted for ${user.email}`,
      data: { reason: "ALREADY_COMPLETED", userId: user.id },
    });
    throw new WaitlistError(
      "Profile bonus already granted",
      "ALREADY_COMPLETED",
    );
  }

  // Idempotent bonus
  try {
    await prisma.rewardLedger.create({
      data: {
        userId: user.id,
        type: "profile",
        amountCoins: REWARDS.PROFILE_COINS,
        amountCents: 0,
        idempotencyKey: `profile:${user.id}`,
        meta: JSON.stringify({ fullName, phone }),
      },
    });
  } catch {
    throw new WaitlistError(
      "Profile bonus already granted",
      "ALREADY_COMPLETED",
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName,
      phone,
      profileCompletedAt: new Date(),
      coinsBalance: { increment: REWARDS.PROFILE_COINS },
    },
  });

  publishEvent({
    type: "profile_completed",
    message: `Profile completed for ${user.email} (+${REWARDS.PROFILE_COINS} coins)`,
    sql: `UPDATE User SET fullName='${fullName}', phone='${phone}', profileCompletedAt=NOW(), coinsBalance=coinsBalance+${REWARDS.PROFILE_COINS} WHERE id='${user.id}';`,
    data: {
      userId: user.id,
      fullName,
      phone,
      amountCoins: REWARDS.PROFILE_COINS,
    },
  });

  return updated;
}

export async function getDashboardByToken(token: string) {
  const user = await prisma.user.findUnique({
    where: { dashboardToken: token },
    include: {
      referralsMade: {
        include: { referee: { select: { email: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
      integrityNode: true,
    },
  });
  if (!user) return null;

  return {
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    signupDate: user.createdAt,
    profileCompleted: Boolean(user.profileCompletedAt),
    referralCode: user.referralCode,
    referralLink: referralLink(user.referralCode),
    totalCoins: user.coinsBalance,
    totalCashCents: user.cashEarnedCents,
    successfulReferrals: user.referralsMade.filter((r) => r.status === "converted")
      .length,
    milestone: milestoneProgress(user.coinsBalance),
    location: {
      city: user.city,
      region: user.region,
      country: user.country,
    },
    referrals: user.referralsMade.map((r) => ({
      email: r.referee.email,
      status: r.status,
      coinsAwarded: r.coinsAwarded,
      cashAwardedCents: r.cashAwardedCents,
      at: r.convertedAt ?? r.createdAt,
    })),
    ledger: user.ledgerEntries,
    integrity: user.integrityNode,
  };
}

export async function getAdminStats() {
  const [
    totalSignups,
    completedProfiles,
    referralsConverted,
    coinAgg,
    cashAgg,
    topReferrers,
    byCountry,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { profileCompletedAt: { not: null } } }),
    prisma.referral.count({ where: { status: "converted" } }),
    prisma.rewardLedger.aggregate({ _sum: { amountCoins: true } }),
    prisma.rewardLedger.aggregate({ _sum: { amountCents: true } }),
    prisma.user.findMany({
      orderBy: { cashEarnedCents: "desc" },
      take: 5,
      select: {
        email: true,
        referralCode: true,
        coinsBalance: true,
        cashEarnedCents: true,
        _count: { select: { referralsMade: true } },
      },
    }),
    prisma.user.groupBy({
      by: ["country"],
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 8,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        email: true,
        referralCode: true,
        coinsBalance: true,
        cashEarnedCents: true,
        city: true,
        country: true,
        createdAt: true,
        referredById: true,
      },
    }),
  ]);

  return {
    totalSignups,
    completedProfiles,
    referralsConverted,
    totalCoinsIssued: coinAgg._sum.amountCoins ?? 0,
    totalCashCents: cashAgg._sum.amountCents ?? 0,
    topReferrers: topReferrers.map((u) => ({
      email: u.email,
      referralCode: u.referralCode,
      referrals: u._count.referralsMade,
      coins: u.coinsBalance,
      cashCents: u.cashEarnedCents,
    })),
    byCountry: byCountry.map((c) => ({
      country: c.country ?? "Unknown",
      count: c._count._all,
    })),
    recentUsers,
  };
}

export async function getReferralTree() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      referralCode: true,
      referredById: true,
      coinsBalance: true,
      cashEarnedCents: true,
      city: true,
      country: true,
      createdAt: true,
      integrityNode: { select: { nodeHash: true, prevHash: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    label: u.email.split("@")[0],
    referralCode: u.referralCode,
    parentId: u.referredById,
    coins: u.coinsBalance,
    cashCents: u.cashEarnedCents,
    city: u.city,
    country: u.country,
    nodeHash: u.integrityNode?.nodeHash ?? null,
    prevHash: u.integrityNode?.prevHash ?? null,
    createdAt: u.createdAt,
  }));
}

export async function getLedgerFeed(limit = 40) {
  return prisma.rewardLedger.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, referralCode: true } },
    },
  });
}
