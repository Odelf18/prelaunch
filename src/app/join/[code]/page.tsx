"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { APP_NAME } from "@/lib/constants";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code || "").toUpperCase();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, referralCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      router.push(`/dashboard/${data.user.dashboardToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="relative z-10 mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 pb-20">
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
          {APP_NAME}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Join via referral
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Code{" "}
          <span className="mono text-[var(--accent)]">{code}</span> - you&apos;ll
          get 100 coins on signup.
        </p>
        <form onSubmit={submit} className="panel mt-8 space-y-4 rounded-2xl p-5">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Email</span>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--accent)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="glow-btn w-full rounded-xl py-3 text-sm"
          >
            {busy ? "Creating account…" : "Join waitlist"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Prefer the systems view?{" "}
          <Link href="/demo" className="text-[var(--accent)]">
            Open live demo
          </Link>
        </p>
      </main>
    </>
  );
}
