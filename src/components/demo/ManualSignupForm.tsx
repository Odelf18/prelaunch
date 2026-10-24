"use client";

import { useState } from "react";

export function ManualSignupForm({
  disabled,
  suggestedCodes,
  onSubmit,
}: {
  disabled?: boolean;
  suggestedCodes: string[];
  onSubmit: (input: {
    email: string;
    referralCode: string;
    fullName: string;
    phone: string;
  }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || localBusy) return;
    setLocalBusy(true);
    try {
      await onSubmit({
        email: email.trim(),
        referralCode: referralCode.trim().toUpperCase(),
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setEmail("");
      setFullName("");
      setPhone("");
      // keep referral code for chaining multiple manual signups
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="panel space-y-4 rounded-3xl p-6 md:p-7"
    >
      <div>
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Manual signup
        </p>
        <p className="mt-1 text-base text-[var(--muted)] md:text-lg">
          Create a real waitlist row yourself - optional referral code + profile
          bonus fields
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm md:text-base">
          <span className="text-[var(--muted)]">Email *</span>
          <input
            type="email"
            required
            disabled={disabled || localBusy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-black/35 px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block text-sm md:text-base">
          <span className="text-[var(--muted)]">Referral code (optional)</span>
          <input
            type="text"
            disabled={disabled || localBusy}
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="e.g. GPRHD5HU"
            className="mono mt-1.5 w-full rounded-xl border border-[var(--line)] bg-black/35 px-4 py-3 text-base uppercase tracking-wider outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block text-sm md:text-base">
          <span className="text-[var(--muted)]">Full name (optional)</span>
          <input
            type="text"
            disabled={disabled || localBusy}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Founder"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-black/35 px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block text-sm md:text-base">
          <span className="text-[var(--muted)]">Phone (optional, +400 coins)</span>
          <input
            type="text"
            disabled={disabled || localBusy}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1-415-555-0100"
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-black/35 px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
          />
        </label>
      </div>

      {suggestedCodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Use code
          </span>
          {suggestedCodes.slice(0, 6).map((code) => (
            <button
              key={code}
              type="button"
              disabled={disabled || localBusy}
              onClick={() => setReferralCode(code)}
              className="ghost-btn mono rounded-lg px-3 py-1.5 text-sm"
            >
              {code}
            </button>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || localBusy || !email.trim()}
        className="glow-btn rounded-xl px-6 py-3 text-base"
      >
        {localBusy ? "Creating…" : "Create profile"}
      </button>
    </form>
  );
}
