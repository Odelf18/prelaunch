"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FeedEvent } from "./types";

export function LiveFeed({ events }: { events: FeedEvent[] }) {
  const shown = [...events].reverse().slice(0, 24);

  return (
    <div className="panel flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl">
      <div className="border-b border-[var(--line)] px-6 py-5">
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Live event stream
        </p>
        <p className="mt-1 text-base text-[var(--muted)] md:text-lg">
          Every write as it happens - full messages, full SQL
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        <AnimatePresence initial={false}>
          {shown.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-[var(--line)] bg-black/30 px-5 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`mono text-sm font-semibold uppercase tracking-wide event-${e.type}`}
                >
                  {e.type}
                </span>
                <span className="mono text-sm text-[var(--muted)]" suppressHydrationWarning>
                  {new Date(e.ts).toISOString().slice(11, 19)} UTC
                </span>
              </div>
              <p className="mt-3 text-base leading-relaxed text-[var(--text)] md:text-lg">
                {e.message}
              </p>
              {e.sql && (
                <pre className="mono mt-3 whitespace-pre-wrap break-all rounded-xl bg-black/40 p-3 text-sm leading-relaxed text-[var(--muted)]">
                  {e.sql}
                </pre>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {shown.length === 0 && (
          <p className="p-8 text-center text-lg text-[var(--muted)]">
            Event stream is quiet - run a signup to fill it.
          </p>
        )}
      </div>
    </div>
  );
}
