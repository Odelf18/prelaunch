"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { APP_NAME } from "@/lib/constants";
import { ReferralTree } from "./ReferralTree";
import { LiveFeed } from "./LiveFeed";
import { LedgerPanel } from "./LedgerPanel";
import { AdminStrip } from "./AdminStrip";
import { CascadeStage, type CascadeStep } from "./CascadeStage";
import { ManualSignupForm } from "./ManualSignupForm";
import type { AdminStats, FeedEvent, LedgerRow, TreeNode } from "./types";

export function DemoShell() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<CascadeStep[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mode, setMode] = useState<"root" | "referred" | null>(null);
  const bootGen = useRef(0);

  const empty = ready && (stats?.totalSignups ?? 0) === 0 && tree.length === 0;

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
    const gen = ++bootGen.current;
    let cancelled = false;

    async function load() {
      try {
        const wipedKey = "prelaunch_demo_wiped_v3";
        const already =
          typeof window !== "undefined" && sessionStorage.getItem(wipedKey);

        if (!already) {
          const resetRes = await fetch("/api/demo/reset", { method: "POST" });
          if (resetRes.ok) {
            sessionStorage.setItem(wipedKey, "1");
            const data = await resetRes.json();
            if (!cancelled && bootGen.current === gen) {
              applyState(data);
              setEvents(data.events ?? []);
              setReady(true);
              return;
            }
          }
        }

        const res = await fetch("/api/demo/state");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!cancelled && bootGen.current === gen) {
          applyState(data);
          setReady(true);
        }
      } catch {
        if (!cancelled && bootGen.current === gen) {
          setError("Failed to load demo state");
          setReady(true);
        }
      }
    }

    void load();
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

  async function playSteps(nextSteps: CascadeStep[]) {
    setSteps(nextSteps);
    setActiveIndex(-1);
    for (let i = 0; i < nextSteps.length; i++) {
      setActiveIndex(i);
      await new Promise((r) => setTimeout(r, 900));
    }
  }

  async function runSimulate(opts?: {
    completeProfile?: boolean;
    fraud?: "duplicate" | "self";
  }) {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setLastMessage(null);
    setMode(null);
    setSteps([]);
    setActiveIndex(-1);

    const prevLedgerIds = new Set(ledger.map((l) => l.id));

    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulate failed");

      const nextSteps = (data.steps as CascadeStep[]) ?? [];

      // Apply DB snapshot immediately so tree/ledger/admin stay in sync
      applyState(data);

      if (data.fraud) {
        setLastMessage(`Blocked: ${data.fraud.message}`);
        await playSteps(nextSteps);
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

        const newLedger = (data.ledger as LedgerRow[]) ?? [];
        const fresh = new Set(
          newLedger.filter((l) => !prevLedgerIds.has(l.id)).map((l) => l.id),
        );
        setFlashIds(fresh);
        setTimeout(() => setFlashIds(new Set()), 3500);

        await playSteps(nextSteps);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function applyCascadeResponse(
    data: {
      result?: {
        user?: { id?: string; email?: string };
        mode?: "root" | "referred";
        referrerCode?: string | null;
      };
      steps?: CascadeStep[];
      stats?: AdminStats;
      tree?: TreeNode[];
      ledger?: LedgerRow[];
      events?: FeedEvent[];
      message?: string;
    },
    opts?: { play?: boolean; message?: string },
  ) {
    const prevLedgerIds = new Set(ledger.map((l) => l.id));
    applyState(data);
    const userId = data.result?.user?.id;
    const nextMode = data.result?.mode ?? null;
    if (nextMode) setMode(nextMode);
    if (userId) setHighlightId(userId);

    const newLedger = data.ledger ?? [];
    const fresh = new Set(
      newLedger.filter((l) => !prevLedgerIds.has(l.id)).map((l) => l.id),
    );
    setFlashIds(fresh);
    setTimeout(() => setFlashIds(new Set()), 3500);

    setLastMessage(
      opts?.message ??
        (nextMode === "root"
          ? `Founder created: ${data.result?.user?.email}`
          : `Referred signup: ${data.result?.user?.email} ← ${data.result?.referrerCode}`),
    );

    if (opts?.play !== false) {
      await playSteps(data.steps ?? []);
    } else {
      setSteps(data.steps ?? []);
      setActiveIndex((data.steps?.length ?? 0) - 1);
    }
  }

  async function reset() {
    if (busy) return;
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
      setLastMessage("Wiped - back to an empty database.");
      setEvents(data.events ?? []);
      sessionStorage.setItem("prelaunch_demo_wiped_v3", "1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  async function runMockTree() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setLastMessage(null);
    setMode(null);
    setSteps([]);
    setActiveIndex(-1);
    try {
      const res = await fetch("/api/demo/mock-tree", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mock tree failed");
      sessionStorage.setItem("prelaunch_demo_wiped_v3", "1");
      await applyCascadeResponse(data, {
        play: false,
        message: `Mock tree ready - ${data.result?.count ?? 6} users with referral links`,
      });
      const last = (data.tree as TreeNode[] | undefined)?.[
        (data.tree?.length ?? 1) - 1
      ];
      if (last) setHighlightId(last.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mock tree failed");
    } finally {
      setBusy(false);
    }
  }

  async function runManual(input: {
    email: string;
    referralCode: string;
    fullName: string;
    phone: string;
  }) {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setLastMessage(null);
    setSteps([]);
    setActiveIndex(-1);
    try {
      const res = await fetch("/api/demo/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email,
          referralCode: input.referralCode || null,
          fullName: input.fullName || null,
          phone: input.phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Manual signup failed");
      await applyCascadeResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Manual signup failed");
    } finally {
      setBusy(false);
    }
  }

  const primaryLabel = !ready
    ? "Preparing empty database…"
    : busy
      ? activeIndex >= 0 && steps[activeIndex]
        ? steps[activeIndex]!.title
        : "Running cascade…"
      : empty
        ? "Create first user (empty DB)"
        : "Simulate referred signup";

  const suggestedCodes = tree.map((n) => n.referralCode).filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 pb-24 md:px-8">
      <section className="relative pt-4 md:pt-8">
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
          {APP_NAME}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
          Start from zero. Watch every write land.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--muted)] md:text-xl">
          Simulate one signup, generate a full mock referral tree, or create a
          profile manually with a referral code.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="glow-btn rounded-2xl px-7 py-4 text-base md:text-lg"
            disabled={!ready || busy}
            onClick={() => runSimulate()}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="ghost-btn rounded-2xl px-5 py-4 text-base"
            disabled={!ready || busy}
            onClick={runMockTree}
          >
            Generate mock tree (6)
          </button>
          <button
            type="button"
            className="ghost-btn rounded-2xl px-5 py-4 text-base"
            disabled={!ready || busy || empty}
            onClick={() => runSimulate({ completeProfile: true })}
          >
            Referral + complete profile
          </button>
          <button
            type="button"
            className="ghost-btn rounded-2xl px-5 py-4 text-base"
            disabled={!ready || busy}
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
              Database is empty. Create the first user, generate a 6-person mock
              tree, or fill the manual form below.
            </p>
          </div>
        )}
      </section>

      <AdminStrip stats={stats} />

      <ManualSignupForm
        disabled={!ready || busy}
        suggestedCodes={suggestedCodes}
        onSubmit={runManual}
      />

      <CascadeStage
        steps={steps}
        activeIndex={activeIndex}
        empty={empty}
        mode={mode}
      />

      <ReferralTree nodes={tree} highlightId={highlightId} />

      <section className="grid gap-6 xl:grid-cols-2">
        <LiveFeed events={events} />
        <LedgerPanel rows={ledger} flashIds={flashIds} />
      </section>

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
            disabled={!ready || busy || empty}
            onClick={() => runSimulate({ fraud: "duplicate" })}
          >
            Try duplicate email
          </button>
          <button
            type="button"
            className="ghost-btn rounded-xl px-4 py-3 text-sm md:text-base"
            disabled={!ready || busy || empty}
            onClick={() => runSimulate({ fraud: "self" })}
          >
            Try self-referral
          </button>
        </div>
      </section>
    </div>
  );
}
