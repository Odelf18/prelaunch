"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FeedEvent } from "./types";

export function LiveFeed({ events }: { events: FeedEvent[] }) {
  const shown = [...events].reverse().slice(0, 18);

  return (
    <div className="panel flex h-full min-h-[280px] flex-col overflow-hidden rounded-2xl">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          Live event stream
        </p>
        <p className="text-sm text-[var(--muted)]">SSE · signup cascade</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 mono text-xs">
        <AnimatePresence initial={false}>
          {shown.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-medium event-${e.type}`}>{e.type}</span>
                <span className="text-[10px] text-[var(--muted)]">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text)]/90">
                {e.message}
              </p>
              {e.sql && (
                <p className="mt-1 truncate text-[10px] text-[var(--muted)]">{e.sql}</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {shown.length === 0 && (
          <p className="p-4 text-center text-[var(--muted)]">
            Waiting for events — hit Simulate.
          </p>
        )}
      </div>
    </div>
  );
}
