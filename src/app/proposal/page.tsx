import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/SiteNav";
import { APP_NAME } from "@/lib/constants";

const QA: { q: string; a: ReactNode }[] = [
  {
    q: "1. Have you built a waitlist + referral + rewards backend before?",
    a: (
      <>
        <p>
          Yes. This repository is a working vertical slice of that system:
          waitlist signup, referral conversion, coin + cash ledger with
          idempotency, profile bonus, welcome email outbox, admin aggregates,
          and an integrity hash chain.
        </p>
        <p className="mt-3">
          Open the{" "}
          <Link href="/demo" className="text-[var(--accent)]">
            live demo
          </Link>{" "}
          and click <strong>Simulate referred signup</strong> to watch every
          write hit the database.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Before sending your application, replace the placeholders in{" "}
          <code className="mono text-[var(--accent)]">PROPOSAL.md</code> with
          1–2 real past projects.
        </p>
      </>
    ),
  },
  {
    q: "2. What stack would you recommend for this project and why?",
    a: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Next.js + TypeScript</strong> — API, dashboards, and demo in
            one deployable unit (Vercel-native).
          </li>
          <li>
            <strong>Prisma + SQLite → Turso/libSQL</strong> — clear SQL schema,
            serverless-friendly production DB, Postgres-migratable later.
          </li>
          <li>
            <strong>Resend</strong> — transactional welcome emails with an
            outbox table for reliability.
          </li>
          <li>
            <strong>IP geo (ipapi.co)</strong> — city/region/country for waitlist
            analytics; hashed IP at rest.
          </li>
        </ul>
        <p className="mt-3 text-[var(--muted)]">
          NestJS or Django are fine if the team standardizes there; for a
          pre-launch waitlist that must ship and later merge into an app, a
          typed Node monolith with clean SQL is the highest leverage.
        </p>
      </>
    ),
  },
  {
    q: "3. How would you structure the database?",
    a: (
      <>
        <p>Core models in <code className="mono">prisma/schema.prisma</code>:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>User</strong> — unique email, referral code, balances, geo,
            dashboard token
          </li>
          <li>
            <strong>Referral</strong> — referrer/referee, status, awards,
            timestamps (<code className="mono">refereeId</code> unique)
          </li>
          <li>
            <strong>RewardLedger</strong> — append-only credits with unique
            idempotency keys
          </li>
          <li>
            <strong>EmailOutbox</strong> — template, payload, provider status
          </li>
          <li>
            <strong>IntegrityNode</strong> — hash chain for auditability
          </li>
        </ul>
        <p className="mt-3">
          User balances are denormalized for fast reads; the ledger is the
          source of truth for audits and migration.
        </p>
      </>
    ),
  },
  {
    q: "4. How would you prevent duplicate or fraudulent referral rewards?",
    a: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Unique email constraint</li>
        <li>Self-referral blocked at signup</li>
        <li>One referral row per referee</li>
        <li>
          Idempotent ledger keys (
          <code className="mono">referral_coins:&#123;refereeId&#125;</code>,{" "}
          <code className="mono">profile:&#123;userId&#125;</code>)
        </li>
        <li>Profile bonus once via timestamp + unique key</li>
        <li>Integrity hash chain for tamper-evident trails</li>
        <li>
          Production: velocity limits, disposable-email blocklists, cash payout
          review
        </li>
      </ul>
    ),
  },
  {
    q: "5. What service would you use for automated welcome emails?",
    a: (
      <p>
        <strong>Resend</strong> — simple API, strong DX, solid transactional
        deliverability. Architecture uses an outbox row first, then send. Without
        an API key, the demo mocks delivery but still records outbox rows so the
        flow stays visible. Postmark/SendGrid are solid alternatives.
      </p>
    ),
  },
  {
    q: "6. How would you track user location?",
    a: (
      <p>
        Extract IP from <code className="mono">x-forwarded-for</code>, resolve
        city/region/country via ipapi.co (or MaxMind at higher volume), store
        location fields plus a <strong>hashed IP</strong>. Reliable for country
        and often city; VPNs reduce accuracy. Suitable for waitlist analytics —
        not a substitute for declared residency in regulated flows.
      </p>
    ),
  },
  {
    q: "7. How would you structure this so it can later connect to the app?",
    a: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Stable user IDs and immutable ledger + referral history</li>
        <li>Fields map 1:1 to future app accounts (no dead-end waitlist schema)</li>
        <li>
          Replace <code className="mono">dashboardToken</code> with real auth
          without rewriting rewards
        </li>
        <li>Export/sync User, Referral, RewardLedger at launch</li>
        <li>Feature-flag waitlist → activated accounts preserving balances</li>
      </ul>
    ),
  },
  {
    q: "8. Please share examples of similar work.",
    a: (
      <>
        <p>
          <strong>Primary artifact — {APP_NAME} (this demo):</strong> sole
          implementer of schema, reward engine, anti-fraud, email outbox, admin
          metrics, integrity tree, and proposal docs. Stack: Next.js, Prisma,
          SQLite/Turso, Resend, SSE.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Add 1–2 prior projects in PROPOSAL.md before submitting your
          application.
        </p>
      </>
    ),
  },
  {
    q: "9. Please explain step by step how you would approach this build.",
    a: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Database models + unique constraints</li>
        <li>Signup: geo → user → 100 coins → referral code → ledger</li>
        <li>Central reward constants; ledger-first credits</li>
        <li>Referral resolve → +500 coins + $20 with idempotency</li>
        <li>Milestone helpers (2,500 / 3,000 coins)</li>
        <li>Welcome email outbox → Resend + dashboard link</li>
        <li>Tokenized dashboard payload</li>
        <li>IP geo + hashed IP</li>
        <li>Admin aggregates & top referrers</li>
        <li>Migration: keep ledger immutable; promote users into the app</li>
      </ol>
    ),
  },
];

export default function ProposalPage() {
  return (
    <>
      <SiteNav active="proposal" />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-24 md:px-10">
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
          Proposal
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Answers to your nine questions
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Same architecture as the{" "}
          <Link href="/demo" className="text-[var(--accent)]">
            live demo
          </Link>
          . Full markdown copy lives in{" "}
          <code className="mono text-sm">PROPOSAL.md</code>.
        </p>

        <div className="mt-12 space-y-10">
          {QA.map((item) => (
            <section key={item.q} className="panel rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-semibold tracking-tight">{item.q}</h2>
              <div className="mt-4 space-y-2 text-[15px] leading-relaxed text-[var(--text)]/90">
                {item.a}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/demo" className="glow-btn rounded-xl px-5 py-3 text-sm">
            Open live demo
          </Link>
          <Link href="/" className="ghost-btn rounded-xl px-5 py-3 text-sm">
            Home
          </Link>
        </div>
      </main>
    </>
  );
}
