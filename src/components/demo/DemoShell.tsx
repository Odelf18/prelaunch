"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { APP_NAME } from "@/lib/constants";
import { ReferralTree } from "./ReferralTree";
import { LiveFeed } from "./LiveFeed";
import { LedgerPanel } from "./LedgerPanel";
import { AdminStrip } from "./AdminStrip";
import { CascadeStage, type CascadeStep } from "./CascadeStage";
import type { AdminStats, FeedEvent, LedgerRow, TreeNode } from "./types";

export function DemoShell() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<CascadeStep[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mode, setMode] = useState<"root" | "referred" | null>(null);
  const empty = (stats?.totalSignups ?? 0) === 0 && tree.length === 0;

  const applyState = useCallback(
    (data: {
      stats?: AdminStats;
      tree?: TreeNode[];
      ledger?: LedgerRow[];
      events?: FeedEvent[];
    }) => {
      if (data.stats) setStats(data.stats);
      if (data.tree) setTree(data.tree);
      if (data.ledger) setLedger(data.ledger);
      if (data.events) setEvents(data.events);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        // Always open the theater on an empty DB — no leftover fake profiles
        const resetRes = await fetch("/api/demo/reset", { method: "POST" });
        if (!resetRes.ok) throw new Error("reset failed");
        const data = await resetRes.json();
        if (!cancelled) {
          applyState(data);
          setSteps([]);
          setActiveIndex(-1);
          setHighlightId(null);
          setMode(null);
          setLastMessage(null);
          setEvents(data.events ?? []);
        }
      } catch {
        if (cancelled) return;
        try {
          const res = await fetch("/api/demo/state");
          const data = await res.json();
          if (!cancelled) applyState(data);
        } catch {
          if (!cancelled) setError("Failed to load demo state");
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyState]);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as FeedEvent;
        setEvents((prev) => {
          if (prev.some((e) => e.id === event.id)) return prev;
          return [...prev, event].slice(-100);
        });
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, []);

  async function playSteps(
    nextSteps: CascadeStep[],
    after?: () => void,
  ) {
    setSteps(nextSteps);
    setActiveIndex(-1);
    for (let i = 0; i < nextSteps.length; i++) {
      setActiveIndex(i);
      await new Promise((r) => setTimeout(r, 850));
    }
    after?.();
  }

  async function runSimulate(opts?: {
    completeProfile?: boolean;
    fraud?: "duplicate" | "self";
  }) {
    setBusy(true);
    setError(null);
    setLastMessage(null);
    setMode(null);
    setSteps([]);
    setActiveIndex(-1);

    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulate failed");

      const nextSteps = (data.steps as CascadeStep[]) ?? [];

      if (data.fraud) {
        setLastMessage(`Blocked: ${data.fraud.message}`);
        await playSteps(nextSteps);
        applyState(data);
      } else {
        const userId = data.result?.user?.id as string | undefined;
        const nextMode = data.result?.mode as "root" | "referred";
        setMode(nextMode);
        setHighlightId(userId ?? null);
        setLastMessage(
          nextMode === "root"
            ? `Founder created: ${data.result?.user?.email}`
            : `Referred signup: ${data.result?.user?.email} ← ${data.result?.referrerCode}`,
        );

        // Reveal cascade first, then snap tree/ledger into place
        await playSteps(nextSteps, () => {
          const newLedger = (data.ledger as LedgerRow[]) ?? [];
          const prevIds = new Set(ledger.map((l) => l.id));
          const fresh = new Set(
            newLedger.filter((l) => !prevIds.has(l.id)).map((l) => l.id),
          );
          setFlashIds(fresh);
          setTimeout(() => setFlashIds(new Set()), 3200);
          applyState(data);
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      applyState(data);
      setHighlightId(null);
      setSteps([]);
      setActiveIndex(-1);
      setMode(null);
      setLastMessage("Wiped — back to an empty database.");
      setEvents(data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  const primaryLabel = busy
    ? activeIndex >= 0 && steps[activeIndex]
      ? steps[activeIndex]!.title
      : "Running cascade…"
    : empty
      ? "Create first user (empty DB)"
      : "Simulate referred signup";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 pb-24 md:px-8">
      {/* Hero */}
      <section className="relative pt-4 md:pt-8">
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
          {APP_NAME}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
          Start from zero. Watch every write land.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--muted)] md:text-xl">
          No fake seed users. First click creates the founder. Next clicks grow
          the referral tree — geo, ledger, email, integrity hash — in a readable
          cascade.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="glow-btn rounded-2xl px-7 py-4 text-base md:text-lg"
            disabled={busy}
            onClick={() => runSimulate()}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="ghost-btn rounded-2xl px-5 py-4 text-base"
            disabled={busy || empty}
            onClick={() => runSimulate({ completeProfile: true })}
          >
            Referral + complete profile
          </button>
          <button
            type="button"
            className="ghost-btn rounded-2xl px-5 py-4 text-base"
            disabled={busy}
            onClick={reset}
          >
            Reset to empty
          </button>
        </div>

        <AnimatePresence mode="wait">
          {(lastMessage || error) && (
            <motion.p
              key={lastMessage || error}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mono mt-5 text-base md:text-lg ${
                error ? "text-[var(--danger)]" : "text-[var(--accent)]"
              }`}
            >
              {error || lastMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {empty && !busy && (
          <div className="panel mt-8 rounded-2xl border-[var(--accent)]/30 px-6 py-5">
            <p className="text-base text-[var(--text)] md:text-lg">
              Database is empty. Your first click inserts the root user (+100
              coins, referral code, welcome email). After that, each click
              simulates someone joining through the latest referral link (+500
              coins + $20 to the referrer).
            </p>
          </div>
        )}
      </section>

      {/* Cascade theater — main wow surface */}
      <CascadeStage
        steps={steps}
        activeIndex={activeIndex}
        empty={empty}
        mode={mode}
      />

      {/* Tree — full width, large */}
      <ReferralTree nodes={tree} highlightId={highlightId} />

      {/* Feed + ledger — large readable panels */}
      <section className="grid gap-6 xl:grid-cols-2">
        <LiveFeed events={events} />
        <LedgerPanel rows={ledger} flashIds={flashIds} />
      </section>

      <AdminStrip stats={stats} />

      <section className="panel flex flex-wrap items-center justify-between gap-5 rounded-3xl px-6 py-6">
        <div>
          <p className="text-lg font-medium">Probe anti-fraud</p>
          <p className="mt-1 text-base text-[var(--muted)]">
            Duplicate email and self-referral attempts are rejected with a
            visible cascade step.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="ghost-btn rounded-xl px-4 py-3 text-sm md:text-base"
            disabled={busy || empty}
            onClick={() => runSimulate({ fraud: "duplicate" })}
          >
            Try duplicate email
          </button>
          <button
            type="button"
            className="ghost-btn rounded-xl px-4 py-3 text-sm md:text-base"
            disabled={busy || empty}
            onClick={() => runSimulate({ fraud: "self" })}
          >
            Try self-referral
          </button>
        </div>
      </section>
    </div>
  );
}
