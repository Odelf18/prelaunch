"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DashboardClient({ token }: { token: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardToken: token, fullName, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="panel mt-6 space-y-4 rounded-2xl p-5"
    >
      <div>
        <p className="text-sm font-medium">Complete your profile</p>
        <p className="text-xs text-[var(--muted)]">
          Earn +400 coins once - name and phone required.
        </p>
      </div>
      <label className="block text-sm">
        <span className="text-[var(--muted)]">Full name</span>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--accent)]"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-[var(--muted)]">Phone</span>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--accent)]"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="glow-btn rounded-xl px-5 py-2.5 text-sm"
      >
        {busy ? "Saving…" : "Save & claim +400 coins"}
      </button>
    </form>
  );
}
