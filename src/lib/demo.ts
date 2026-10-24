import { prisma } from "./db";
import { signupUser, completeProfile } from "./waitlist";
import { publishEvent } from "./events";
import { customAlphabet } from "nanoid";

const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz", 6);

const FIRST = [
  "Maya",
  "Noah",
  "Iris",
  "Leo",
  "Zoe",
  "Kai",
  "Ava",
  "Eli",
  "Nina",
  "Omar",
];
const LAST = [
  "Chen",
  "Brooks",
  "Patel",
  "Nguyen",
  "Silva",
  "Kim",
  "Rossi",
  "Okada",
  "Dubois",
  "Hassan",
];
const CITIES = [
  { city: "Miami", region: "Florida", country: "United States" },
  { city: "Amsterdam", region: "North Holland", country: "Netherlands" },
  { city: "Sydney", region: "NSW", country: "Australia" },
  { city: "Lisbon", region: "Lisbon", country: "Portugal" },
  { city: "Chicago", region: "Illinois", country: "United States" },
  { city: "Seoul", region: "Seoul", country: "South Korea" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export async function ensureSeeded() {
  const count = await prisma.user.count();
  if (count > 0) return { seeded: false, count };

  // Inline minimal seed so first demo visit works without CLI
  const { signupUser: su, completeProfile: cp } = await import("./waitlist");
  const root = await su({
    email: "alex@founder.demo",
    simulate: true,
    simulateGeo: {
      city: "San Francisco",
      region: "California",
      country: "United States",
    },
  });
  await cp({
    userId: root.user.id,
    fullName: "Alex Founder",
    phone: "+1-415-555-0100",
  });

  const second = await su({
    email: "jordan@early.demo",
    referralCode: root.user.referralCode,
    simulate: true,
    simulateGeo: {
      city: "Austin",
      region: "Texas",
      country: "United States",
    },
  });
  await cp({
    userId: second.user.id,
    fullName: "Jordan Early",
    phone: "+1-512-555-0101",
  });

  await su({
    email: "sam@growth.demo",
    referralCode: second.user.referralCode,
    simulate: true,
    simulateGeo: {
      city: "London",
      region: "England",
      country: "United Kingdom",
    },
  });

  return { seeded: true, count: await prisma.user.count() };
}

export async function simulateReferredSignup(opts?: {
  completeProfile?: boolean;
  referrerCode?: string;
}) {
  await ensureSeeded();

  let referrerCode = opts?.referrerCode;
  if (!referrerCode) {
    // Prefer a user who already has referrals, else any user
    const withRefs = await prisma.user.findFirst({
      where: { referralsMade: { some: {} } },
      orderBy: { createdAt: "asc" },
    });
    const any = withRefs ?? (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));
    if (!any) throw new Error("No referrer available — seed first");
    referrerCode = any.referralCode;
  }

  const first = pick(FIRST);
  const last = pick(LAST);
  const email = `${first.toLowerCase()}.${last.toLowerCase()}.${nano()}@demo.mail`;
  const geo = pick(CITIES);

  const result = await signupUser({
    email,
    referralCode: referrerCode,
    simulate: true,
    simulateGeo: geo,
  });

  let profile = null;
  if (opts?.completeProfile !== false) {
    // slight delay feel handled by client; do profile immediately server-side optional
    if (opts?.completeProfile) {
      profile = await completeProfile({
        userId: result.user.id,
        fullName: `${first} ${last}`,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      });
    }
  }

  return { ...result, profile, referrerCode };
}

export async function simulateFraud(kind: "duplicate" | "self") {
  await ensureSeeded();
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No users");

  if (kind === "duplicate") {
    try {
      await signupUser({
        email: user.email,
        referralCode: user.referralCode,
        simulate: true,
      });
    } catch (e) {
      return {
        blocked: true,
        kind,
        message: e instanceof Error ? e.message : "blocked",
      };
    }
  }

  if (kind === "self") {
    try {
      await signupUser({
        email: user.email,
        referralCode: user.referralCode,
        simulate: true,
      });
    } catch (e) {
      return {
        blocked: true,
        kind,
        message: e instanceof Error ? e.message : "blocked",
      };
    }
  }

  return { blocked: false, kind };
}

export async function resetDemo() {
  await prisma.integrityNode.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.rewardLedger.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.user.deleteMany();

  publishEvent({
    type: "stats",
    message: "Demo database wiped — re-seeding…",
    sql: "DELETE FROM IntegrityNode; DELETE FROM EmailOutbox; DELETE FROM RewardLedger; DELETE FROM Referral; DELETE FROM User;",
  });

  return ensureSeeded();
}
