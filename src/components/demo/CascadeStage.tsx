"use client";

import { AnimatePresence, motion } from "framer-motion";

export type CascadeStep = {
  id: string;
  type: string;
  title: string;
  message: string;
  sql?: string;
};

const TYPE_HINT: Record<string, string> = {
  geo: "Resolve city / region / country from IP (hashed at rest).",
  user_created: "Insert unique email, mint referral code, grant signup coins.",
  reward_credited: "Append-only ledger row with an idempotency key.",
  referral_linked: "Wire referrer → referee and credit coins + cash once.",
  email_queued: "Outbox row first, then Resend (or mock) welcome email.",
  integrity_node: "Hash-chain this signup to the previous node for audit.",
  profile_completed: "One-time +400 coins when name + phone are saved.",
  fraud_blocked: "Constraint or business rule rejected the write.",
  stats: "Operational note.",
};

export function CascadeStage({
  steps,
  activeIndex,
  empty,
  mode,
}: {
  steps: CascadeStep[];
  activeIndex: number;
  empty: boolean;
  mode?: "root" | "referred" | null;
}) {
  const active = activeIndex >= 0 ? steps[activeIndex] : null;

  return (
    <div className="panel relative overflow-hidden rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
            Live cascade
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            {empty && steps.length === 0
              ? "Empty database — waiting for the first write"
              : active
                ? active.title
                : "Cascade complete"}
          </h2>
          {mode && (
            <p className="mt-2 text-base text-[var(--muted)]">
              {mode === "root"
                ? "Organic signup (no referral code) — founder of the tree."
                : "Referred signup — parent link + rewards fire together."}
            </p>
          )}
        </div>
        <div className="mono text-sm text-[var(--muted)]">
          {steps.length > 0
            ? `Step ${Math.min(activeIndex + 1, steps.length)} / ${steps.length}`
            : "0 / 0"}
        </div>
      </div>

      {/* Progress rail */}
      {steps.length > 0 && (
        <div className="mt-6 flex gap-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= activeIndex ? "bg-[var(--accent)]" : "bg-white/10"
              }`}
              title={s.title}
            />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-[var(--line)] bg-black/35 p-6 md:p-8"
            >
              <p
                className={`mono text-sm font-semibold uppercase tracking-[0.18em] event-${active.type}`}
              >
                {active.type}
              </p>
              <p className="mt-4 text-xl leading-relaxed text-[var(--text)] md:text-2xl">
                {active.message}
              </p>
              <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
                {TYPE_HINT[active.type] ?? "System event"}
              </p>
              {active.sql && (
                <pre className="mono mt-6 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-dim)] p-4 text-sm leading-relaxed text-[var(--accent)] md:text-[15px]">
                  {active.sql}
                </pre>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-black/20 p-8 text-center"
            >
              <div>
                <p className="text-lg text-[var(--muted)]">
                  {empty
                    ? "Hit the green button — the first INSERT will appear here in large type."
                    : "Run another signup to replay the cascade in this theater."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <p className="mono text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            Step log
          </p>
          <ol className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
            {steps.length === 0 && (
              <li className="rounded-xl border border-[var(--line)] px-4 py-3 text-base text-[var(--muted)]">
                No steps yet
              </li>
            )}
            {steps.map((s, i) => {
              const on = i === activeIndex;
              const done = i < activeIndex;
              return (
                <li
                  key={s.id}
                  className={`rounded-xl border px-4 py-3 transition-all ${
                    on
                      ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                      : done
                        ? "border-[var(--line)] bg-black/25 opacity-80"
                        : "border-[var(--line)] opacity-40"
                  }`}
                >
                  <p className="text-sm font-medium md:text-base">{s.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                    {s.message}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
