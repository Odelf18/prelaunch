import { prisma } from "./db";
import { signupUser, completeProfile } from "./waitlist";
import { clearEvents, publishEvent, recentEvents } from "./events";
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

/** No auto-seed — demo always starts empty unless the user clicks. */
export async function ensureEmptyReady() {
  const count = await prisma.user.count();
  return { count };
}

export async function simulateSignup(opts?: {
  completeProfile?: boolean;
  referrerCode?: string;
}) {
  clearEvents();

  const existingCount = await prisma.user.count();
  const first = pick(FIRST);
  const last = pick(LAST);
  const email = `${first.toLowerCase()}.${last.toLowerCase()}.${nano()}@demo.mail`;
  const geo = pick(CITIES);

  let referrerCode = opts?.referrerCode ?? null;
  let mode: "root" | "referred" = "root";

  if (existingCount === 0) {
    // First click: organic founder signup (no referral)
    referrerCode = null;
    mode = "root";
  } else {
    mode = "referred";
    if (!referrerCode) {
      // Prefer the most recent user as referrer (builds a visible chain)
      const latest = await prisma.user.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (!latest) throw new Error("No referrer available");
      referrerCode = latest.referralCode;
    }
  }

  const marker = Date.now();
  const result = await signupUser({
    email,
    referralCode: referrerCode,
    simulate: true,
    simulateGeo: geo,
  });

  let profile = null;
  if (opts?.completeProfile) {
    profile = await completeProfile({
      userId: result.user.id,
      fullName: `${first} ${last}`,
      phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    });
  }

  const raw = recentEvents(40).filter((e) => e.ts >= marker - 50);
  // Collapse noisy duplicates (e.g. double email publishes) while keeping reward rows
  const steps: {
    id: string;
    type: string;
    title: string;
    message: string;
    sql?: string;
    data?: Record<string, unknown>;
  }[] = [];
  for (const e of raw) {
    const prev = steps[steps.length - 1];
    if (prev && prev.type === e.type && e.type === "email_queued") {
      prev.message = e.message;
      prev.sql = e.sql;
      continue;
    }
    steps.push({
      id: e.id,
      type: e.type,
      title: stepTitle(e.type, steps.length, mode),
      message: e.message,
      sql: e.sql,
      data: e.data,
    });
  }

  return {
    ...result,
    profile,
    referrerCode,
    mode,
    displayName: `${first} ${last}`,
    steps,
  };
}

function stepTitle(
  type: string,
  index = 0,
  mode: "root" | "referred" = "root",
): string {
  const n = index + 1;
  switch (type) {
    case "geo":
      return `${n} · Location capture`;
    case "user_created":
      return `${n} · User record created`;
    case "reward_credited":
      return `${n} · Reward ledger write`;
    case "referral_linked":
      return `${n} · Referral edge linked`;
    case "email_queued":
      return `${n} · Welcome email`;
    case "integrity_node":
      return `${n} · Integrity hash appended`;
    case "profile_completed":
      return `${n} · Profile bonus`;
    case "fraud_blocked":
      return `${n} · Blocked · anti-fraud`;
    default:
      return `${n} · ${type}${mode === "referred" ? "" : ""}`;
  }
}

export async function simulateFraud(kind: "duplicate" | "self") {
  clearEvents();
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return {
      blocked: true,
      kind,
      message: "Create at least one user first",
      steps: [] as {
        id: string;
        type: string;
        title: string;
        message: string;
        sql?: string;
      }[],
    };
  }

  const marker = Date.now();
  try {
    await signupUser({
      email: user.email,
      referralCode: user.referralCode,
      simulate: true,
    });
  } catch (e) {
    const steps = recentEvents(20)
      .filter((ev) => ev.ts >= marker - 50)
      .map((ev, i) => ({
        id: ev.id,
        type: ev.type,
        title: stepTitle(ev.type, i),
        message: ev.message,
        sql: ev.sql,
      }));
    return {
      blocked: true,
      kind,
      message: e instanceof Error ? e.message : "blocked",
      steps,
    };
  }

  return { blocked: false, kind, steps: [] };
}

export async function resetDemo() {
  await prisma.integrityNode.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.rewardLedger.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.user.deleteMany();
  clearEvents();

  publishEvent({
    type: "stats",
    message: "Database wiped — empty slate. Create the first user to begin.",
    sql: "DELETE FROM User; DELETE FROM Referral; DELETE FROM RewardLedger; …",
  });

  return { count: 0 };
}

/** @deprecated kept for any leftover imports — no longer seeds fake users */
export async function ensureSeeded() {
  return ensureEmptyReady();
}

/** @deprecated use simulateSignup */
export async function simulateReferredSignup(opts?: {
  completeProfile?: boolean;
  referrerCode?: string;
}) {
  return simulateSignup(opts);
}
