"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME } from "@/lib/constants";
import { ReferralTree } from "./ReferralTree";
import { LiveFeed } from "./LiveFeed";
import { LedgerPanel } from "./LedgerPanel";
import { AdminStrip } from "./AdminStrip";
import type { AdminStats, FeedEvent, LedgerRow, TreeNode } from "./types";

type Phase =
  | "idle"
  | "geo"
  | "user"
  | "referral"
  | "rewards"
  | "email"
  | "integrity"
  | "done";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Ready",
  geo: "Capturing location…",
  user: "Creating user record…",
  referral: "Linking referral…",
  rewards: "Crediting rewards…",
  email: "Queuing welcome email…",
  integrity: "Appending integrity hash…",
  done: "Cascade complete",
};

export function DemoShell() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyState = useCallback(
    (data: {
      stats?: AdminStats;
      tree?: TreeNode[];
      ledger?: LedgerRow[];
      events?: FeedEvent[];
    }) => {
      if (data.stats) setStats(data.stats);
      if (data.tree) setTree(data.tree);
      if (data.ledger) {
        setLedger(data.ledger);
      }
      if (data.events) setEvents(data.events);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demo/state");
        const data = await res.json();
        if (!cancelled) applyState(data);
      } catch {
        if (!cancelled) setError("Failed to load demo state");
      }
    })();
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
          return [...prev, event].slice(-80);
        });
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, []);

  async function runSimulate(opts?: {
    completeProfile?: boolean;
    fraud?: "duplicate" | "self";
  }) {
    setBusy(true);
    setError(null);
    setLastMessage(null);

    if (!opts?.fraud) {
      const phases: Phase[] = [
        "geo",
        "user",
        "referral",
        "rewards",
        "email",
        "integrity",
      ];
      for (const p of phases) {
        setPhase(p);
        await new Promise((r) => setTimeout(r, 380));
      }
    } else {
      setPhase("user");
    }

    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulate failed");

      if (data.fraud) {
        setLastMessage(`Blocked: ${data.fraud.message}`);
        setPhase("done");
      } else {
        const userId = data.result?.user?.id as string | undefined;
        setHighlightId(userId ?? null);
        setLastMessage(
          `Created ${data.result?.user?.email} via ${data.result?.referrerCode}`,
        );
        const newLedger = (data.ledger as LedgerRow[]) ?? [];
        const prevIds = new Set(ledger.map((l) => l.id));
        const fresh = new Set(
          newLedger.filter((l) => !prevIds.has(l.id)).map((l) => l.id),
        );
        setFlashIds(fresh);
        setTimeout(() => setFlashIds(new Set()), 2500);
        setPhase("done");
      }

      applyState(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("idle");
    } finally {
      setBusy(false);
      setTimeout(() => setPhase("idle"), 1600);
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
      setLastMessage("Demo reset & re-seeded");
      setPhase("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 md:px-8">
      {/* Hero viewport */}
      <section className="relative flex min-h-[calc(100vh-5.5rem)] flex-col justify-center gap-10 py-6 lg:flex-row lg:items-center lg:gap-12">
        <div className="max-w-xl shrink-0 space-y-6">
          <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
            {APP_NAME}
          </p>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.25rem]">
            Watch a referred signup hit the database — live.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-[var(--muted)] md:text-lg">
            One click runs the full waitlist cascade: geo, user row, referral
            edge, coin & cash ledger, welcome email, integrity hash.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="glow-btn rounded-xl px-6 py-3.5 text-sm md:text-base"
              disabled={busy}
              onClick={() => runSimulate()}
            >
              {busy && phase !== "idle" && phase !== "done"
                ? PHASE_LABELS[phase]
                : "Simulate referred signup"}
            </button>
            <button
              type="button"
              className="ghost-btn rounded-xl px-4 py-3 text-sm"
              disabled={busy}
              onClick={() => runSimulate({ completeProfile: true })}
            >
              + complete profile
            </button>
          </div>
          <AnimatePresence mode="wait">
            {(lastMessage || error || (busy && phase !== "idle")) && (
              <motion.p
                key={lastMessage || error || phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mono text-xs ${
                  error ? "text-[var(--danger)]" : "text-[var(--accent)]"
                }`}
              >
                {error || lastMessage || PHASE_LABELS[phase]}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-0 flex-1">
          <ReferralTree nodes={tree} highlightId={highlightId} />
        </div>
      </section>

      {/* System panels */}
      <section className="grid gap-4 lg:grid-cols-2">
        <LiveFeed events={events} />
        <LedgerPanel rows={ledger} flashIds={flashIds} />
      </section>

      <section>
        <AdminStrip stats={stats} />
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div>
          <p className="text-sm font-medium">Probe the anti-fraud layer</p>
          <p className="text-xs text-[var(--muted)]">
            Duplicate email and self-referral attempts are rejected with visible
            events.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ghost-btn rounded-lg px-3 py-2 text-xs"
            disabled={busy}
            onClick={() => runSimulate({ fraud: "duplicate" })}
          >
            Try duplicate email
          </button>
          <button
            type="button"
            className="ghost-btn rounded-lg px-3 py-2 text-xs"
            disabled={busy}
            onClick={() => runSimulate({ fraud: "self" })}
          >
            Try self-referral
          </button>
          <button
            type="button"
            className="ghost-btn rounded-lg px-3 py-2 text-xs"
            disabled={busy}
            onClick={reset}
          >
            Reset demo
          </button>
        </div>
      </section>
    </div>
  );
}
