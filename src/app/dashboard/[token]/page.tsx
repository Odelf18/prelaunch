import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { getDashboardByToken } from "@/lib/waitlist";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getDashboardByToken(token);
  if (!data) notFound();

  return (
    <>
      <SiteNav />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-20 md:px-10">
        <p className="mono text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
          Member dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {data.fullName ?? data.email}
        </h1>
        <p className="mt-1 text-[var(--muted)]">{data.email}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="panel rounded-2xl p-5">
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Coins
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {data.totalCoins.toLocaleString()}
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Cash earned
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              ${(data.totalCashCents / 100).toFixed(0)}
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Referrals
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {data.successfulReferrals}
            </p>
          </div>
        </div>

        <div className="panel mt-6 rounded-2xl p-5">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Milestone progress
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${data.milestone.percentToNext}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {data.milestone.next
              ? `${data.milestone.remainingToNext} coins to unlock: ${data.milestone.next.label}`
              : "All milestones unlocked"}
          </p>
          {data.milestone.unlocked.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-[var(--accent)]">
              {data.milestone.unlocked.map((m) => (
                <li key={m.coins}>✓ {m.label}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel mt-6 space-y-3 rounded-2xl p-5">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Your referral link
          </p>
          <p className="mono break-all text-sm text-[var(--accent)]">
            {data.referralLink}
          </p>
          <p className="text-xs text-[var(--muted)]">
            Code: {data.referralCode} · Signed up{" "}
            {new Date(data.signupDate).toLocaleDateString()} ·{" "}
            {[data.location.city, data.location.region, data.location.country]
              .filter(Boolean)
              .join(", ") || "Location pending"}
          </p>
        </div>

        {!data.profileCompleted && (
          <DashboardClient token={token} />
        )}

        {data.profileCompleted && (
          <div className="panel mt-6 rounded-2xl p-5 text-sm text-[var(--muted)]">
            Profile complete · {data.fullName} · {data.phone}
          </div>
        )}

        <div className="panel mt-6 rounded-2xl p-5">
          <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Referral history
          </p>
          {data.referrals.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No referrals yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.referrals.map((r, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-4 border-t border-[var(--line)] py-2 text-sm first:border-0"
                >
                  <span>{r.email}</span>
                  <span className="mono text-[var(--muted)]">
                    +{r.coinsAwarded} · ${(r.cashAwardedCents / 100).toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data.integrity && (
          <div className="panel mt-6 rounded-2xl p-5 mono text-xs text-[var(--muted)]">
            <p className="uppercase tracking-[0.18em]">Integrity node</p>
            <p className="mt-2 break-all text-[var(--accent)]">
              {data.integrity.nodeHash}
            </p>
            <p className="mt-1 break-all">prev: {data.integrity.prevHash}</p>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          <Link href="/demo" className="text-[var(--accent)]">
            ← Back to live demo
          </Link>
        </p>
      </main>
    </>
  );
}
