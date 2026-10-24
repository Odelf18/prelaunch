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
    <div className="panel flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          Reward ledger
        </p>
        <p className="text-sm text-[var(--muted)]">Idempotent DB writes</p>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[420px] border-collapse mono text-[11px]">
          <thead className="sticky top-0 bg-[var(--bg-panel-solid)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">type</th>
              <th className="px-3 py-2 font-medium">user</th>
              <th className="px-3 py-2 font-medium">coins</th>
              <th className="px-3 py-2 font-medium">cash</th>
              <th className="px-3 py-2 font-medium">key</th>
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
                    <td className="px-3 py-2 text-[var(--accent)]">{r.type}</td>
                    <td className="max-w-[120px] truncate px-3 py-2">
                      {r.user.email.split("@")[0]}
                    </td>
                    <td className="px-3 py-2">
                      {r.amountCoins ? `+${r.amountCoins}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.amountCents ? `$${(r.amountCents / 100).toFixed(0)}` : "—"}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-[var(--muted)]">
                      {r.idempotencyKey}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--muted)]">No ledger rows yet.</p>
        )}
      </div>
    </div>
  );
}
