"use client";

import { motion } from "framer-motion";
import type { AdminStats } from "./types";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <motion.div
      layout
      className="min-w-[120px] flex-1 rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3"
    >
      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
    </motion.div>
  );
}

export function AdminStrip({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <div className="panel rounded-2xl px-4 py-6 text-center text-sm text-[var(--muted)]">
        Loading admin metrics…
      </div>
    );
  }

  const top = stats.topReferrers[0];

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Admin visibility
          </p>
          <p className="text-sm text-[var(--muted)]">
            Internal reporting surface — same queries the ops team would use
          </p>
        </div>
        {top && (
          <p className="mono hidden text-xs text-[var(--accent)] md:block">
            Top referrer: {top.email.split("@")[0]} · {top.referrals} refs · $
            {(top.cashCents / 100).toFixed(0)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
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
        <div className="panel flex flex-wrap gap-2 rounded-xl px-4 py-3">
          <span className="mono mr-2 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Locations
          </span>
          {stats.byCountry.map((c) => (
            <span
              key={c.country}
              className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]"
            >
              {c.country}{" "}
              <span className="text-[var(--text)]">{c.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
