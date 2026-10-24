import fs from "fs";
import path from "path";

/**
 * On Vercel without Turso, SQLite must live in /tmp (writable).
 * We copy a committed seed DB on cold start so tables exist.
 */
export function resolveSqliteUrl(): string | null {
  if (process.env.TURSO_DATABASE_URL) return null;

  if (process.env.VERCEL || process.env.USE_TMP_SQLITE === "1") {
    const tmp = "/tmp/prelaunch-demo.db";
    const seedCandidates = [
      path.join(process.cwd(), "prisma", "demo-seed.db"),
      path.join(process.cwd(), "prisma", "dev.db"),
    ];
    // Always bootstrap from the empty seed so cold starts don't revive old fake users
    const seed = seedCandidates.find((p) => fs.existsSync(p));
    if (seed) {
      fs.copyFileSync(seed, tmp);
    }
    return `file:${tmp}`;
  }

  return process.env.DATABASE_URL ?? "file:./dev.db";
}
