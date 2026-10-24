"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LedgerRow } from "./types";

export function LedgerPanel({
  rows,
  flashIds,
}: {
  rows: LedgerRow[];
  flashIds?: Set<string>;
}) {
  return (
    <div className="panel flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl">
      <div className="border-b border-[var(--line)] px-6 py-5">
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Reward ledger
        </p>
        <p className="mt-1 text-base text-[var(--muted)] md:text-lg">
          Append-only credits · unique idempotency keys
        </p>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm md:text-base">
          <thead className="sticky top-0 bg-[var(--bg-panel-solid)] text-[var(--muted)]">
            <tr className="mono text-xs uppercase tracking-[0.14em]">
              <th className="px-5 py-4 font-medium">Type</th>
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">Coins</th>
              <th className="px-5 py-4 font-medium">Cash</th>
              <th className="px-5 py-4 font-medium">Idempotency key</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((r) => {
                const isNew = flashIds?.has(r.id);
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`ledger-row border-t border-[var(--line)] ${isNew ? "new" : ""}`}
                  >
                    <td className="mono px-5 py-4 text-[var(--accent)]">{r.type}</td>
                    <td className="px-5 py-4">
                      <span className="block break-all">{r.user.email}</span>
                      <span className="mono text-sm text-[var(--muted)]">
                        {r.user.referralCode}
                      </span>
                    </td>
                    <td className="mono px-5 py-4 text-lg tabular-nums">
                      {r.amountCoins ? `+${r.amountCoins}` : "—"}
                    </td>
                    <td className="mono px-5 py-4 text-lg tabular-nums">
                      {r.amountCents
                        ? `$${(r.amountCents / 100).toFixed(0)}`
                        : "—"}
                    </td>
                    <td className="mono break-all px-5 py-4 text-sm text-[var(--muted)]">
                      {r.idempotencyKey}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-10 text-center text-lg text-[var(--muted)]">
            Ledger is empty — rewards will land here as rows.
          </p>
        )}
      </div>
    </div>
  );
}
