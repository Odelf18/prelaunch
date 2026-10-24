import { createHash } from "crypto";

export function sha256(...parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function hashEmail(email: string): string {
  return sha256(email.toLowerCase().trim());
}

export function hashIp(ip: string): string {
  return sha256(ip, process.env.IP_HASH_SALT ?? "prelaunch-demo-salt");
}

export function buildIntegrityHash(input: {
  userId: string;
  referrerId: string | null;
  email: string;
  timestamp: string;
  prevHash: string;
}): string {
  return sha256(
    input.userId,
    input.referrerId ?? "root",
    hashEmail(input.email),
    input.timestamp,
    input.prevHash,
  );
}
