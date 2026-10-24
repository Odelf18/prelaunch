"use client";

import { motion } from "framer-motion";
import type { AdminStats } from "./types";

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <motion.div
      layout
      className="min-w-[140px] flex-1 rounded-2xl border border-[var(--line)] bg-black/25 px-5 py-5"
    >
      <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums md:text-4xl">
        {value}
      </p>
    </motion.div>
  );
}

export function AdminStrip({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <div className="panel rounded-3xl px-6 py-8 text-center text-lg text-[var(--muted)]">
        Loading admin metrics…
      </div>
    );
  }

  const top = stats.topReferrers[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Admin visibility
          </p>
          <p className="mt-1 text-base text-[var(--muted)] md:text-lg">
            Same aggregates an ops team would query after launch
          </p>
        </div>
        {top && (
          <p className="mono text-sm text-[var(--accent)] md:text-base">
            Top referrer: {top.email} · {top.referrals} refs · $
            {(top.cashCents / 100).toFixed(0)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <Stat label="Signups" value={String(stats.totalSignups)} />
        <Stat label="Profiles done" value={String(stats.completedProfiles)} />
        <Stat label="Referrals" value={String(stats.referralsConverted)} />
        <Stat
          label="Coins issued"
          value={stats.totalCoinsIssued.toLocaleString()}
        />
        <Stat
          label="Cash rewards"
          value={`$${(stats.totalCashCents / 100).toLocaleString()}`}
        />
      </div>
      {stats.byCountry.length > 0 && (
        <div className="panel flex flex-wrap gap-3 rounded-2xl px-5 py-4">
          <span className="mono mr-1 self-center text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Locations
          </span>
          {stats.byCountry.map((c) => (
            <span
              key={c.country}
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] md:text-base"
            >
              {c.country}{" "}
              <span className="font-semibold text-[var(--text)]">{c.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
