# Proposal — Fintech Waitlist + Referral + Rewards Backend

**Live demo:** see deployed URL on the homepage after Vercel deploy (or run locally → `/demo`)  
**Stack demo:** Next.js · Prisma · SQLite/Turso · Resend · SSE event stream

This document answers the nine proposal questions. The accompanying live demo implements the same architecture so you can verify the logic, not just read about it.

---

## 1. Have you built a waitlist + referral + rewards backend before?

Yes. This repository is a working vertical slice of exactly that system:

- Waitlist signup with unique email constraints and referral codes
- Referral conversion tracking (who referred whom, timestamps, status)
- Coin + cash reward ledger with idempotency keys
- Profile completion bonus (once-only)
- Welcome email outbox (Resend or mocked)
- Admin aggregates (signups, coins, cash, top referrers, geo)
- Integrity hash chain for auditability of the referral graph

Open `/demo` and click **Simulate referred signup** to watch the cascade hit the database in real time.

> **Add your past projects here (replace this block before sending):**
>
> - **Project:** _[name]_ — Role: _[backend / full-stack]_ — Stack: _[…]_ — Built: _[referral system / waitlist / …]_
> - **Project:** _[name]_ — Role: _[…]_ — Stack: _[…]_ — Built: _[…]_

---

## 2. What stack would you recommend and why?

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | **Node.js + Next.js (App Router) + TypeScript** | One codebase for API + dashboard + admin demo; first-class Vercel deploy; typed end-to-end |
| Database | **SQLite (local) → Turso/libSQL (prod)** | SQL schema you can migrate to Postgres later; Turso gives serverless-friendly SQLite with replication |
| ORM | **Prisma** | Clear schema as documentation; migrations; unique constraints for anti-fraud |
| Email | **Resend** | Simple API, React-friendly templates, excellent DX; outbox table for reliability |
| Geo | **IP via `x-forwarded-for` + ipapi.co** | Good enough city/region/country for waitlist analytics; hashed IP at rest |
| Realtime demo | **Server-Sent Events** | Lightweight live feed without WebSocket infra |

**Tradeoffs considered:** NestJS would be fine for a larger team/service split; Django is excellent if the team is Python-first. For a pre-launch waitlist that must ship fast and later migrate into an app, a typed Node monolith with a clean SQL schema is the highest leverage.

---

## 3. How would you structure the database?

Core tables (see `prisma/schema.prisma`):

- **User** — email (unique), profile fields, `referralCode`, `referredById`, balances, geo, `dashboardToken`
- **Referral** — `referrerId`, `refereeId` (unique), status, awards, timestamps
- **RewardLedger** — append-only credits with **`idempotencyKey` (unique)**
- **EmailOutbox** — template, payload, provider id, status (pending/sent/mocked/failed)
- **IntegrityNode** — hash chain linking each signup to its referrer + previous node

Balances on `User` are denormalized for fast dashboard reads; the ledger is the source of truth for audits and migrations.

---

## 4. How would you prevent duplicate or fraudulent referral rewards?

1. **Unique email** — no double registration  
2. **Self-referral block** — referrer email cannot equal referee email; code cannot credit yourself  
3. **One referral row per referee** — `refereeId @unique`  
4. **Idempotent ledger keys** — e.g. `referral_coins:{refereeId}`, `profile:{userId}`  
5. **Profile bonus once** — `profileCompletedAt` + unique ledger key  
6. **Integrity hash chain** — tamper-evident trail of signup order / referral edges  
7. **(Production hardening)** device/IP velocity limits, disposable-email blocklists, manual review queue for cash payouts

The demo exposes “Try duplicate email” / “Try self-referral” so you can see rejections as live events.

---

## 5. What service for automated welcome emails?

**Resend.**

- Clean API, fast setup, good deliverability for transactional mail  
- Easy to swap templates; works with an **outbox** pattern (write DB row first, then send)  
- Without `RESEND_API_KEY`, the demo **mocks** sends but still records outbox rows — so the architecture is visible either way  

Alternatives: Postmark (excellent deliverability), SendGrid (enterprise features). I prefer Resend for speed-to-value on a pre-launch product.

---

## 6. How would you track user location?

1. Read client IP from `x-forwarded-for` / `x-real-ip` (Vercel/edge aware)  
2. Resolve city / region / country via **ipapi.co** (or MaxMind locally for higher volume)  
3. Store **city, region, country** on the user; store **hashed IP** only (privacy)  

**Reliability:** IP geo is typically accurate to country and often city for residential IPs; VPNs/mobile carriers reduce city accuracy. For a waitlist, this is the right cost/accuracy tradeoff. For production fintech compliance, pair with optional user-declared country and never treat IP geo as legal residency.

---

## 7. How would you structure this so it can later connect to the app?

- Stable **user IDs** (cuid) and immutable **ledger** + **referral** history  
- No “waitlist-only” dead-end fields — balances and profile map 1:1 to app accounts  
- `dashboardToken` can be retired in favor of real auth (magic link → JWT/session) without rewriting rewards  
- Migration path: export/sync `User`, `Referral`, `RewardLedger` into the main app DB (same Postgres/Turso or logical dump)  
- Feature flags: waitlist mode → “activated” when the main app launches, preserving coins/cash  

---

## 8. Examples of similar work

**This demo (primary artifact for this application)**  
- What: Full waitlist + referral + dual currency rewards + admin metrics + integrity tree  
- Role: Sole designer/implementer  
- Tech: Next.js, Prisma, SQLite/Turso, Resend, SSE, Framer Motion  
- Built personally: schema, reward engine, anti-fraud, email outbox, demo UX, proposal

**Additional examples — fill in before sending:**

| Project | Role | Tech | What I built |
|---------|------|------|--------------|
| _Your project_ | _…_ | _…_ | _referral / waitlist / rewards / …_ |
| _Your project_ | _…_ | _…_ | _…_ |

---

## 9. Step-by-step build approach

1. **Database** — Model users, referrals, ledger, email outbox, integrity nodes; enforce uniques  
2. **Signup flow** — Validate email → geo → create user + 100 coins + code → ledger row → optional referral conversion  
3. **Rewards logic** — Central constants; ledger-first credits; update denormalized balances  
4. **Referral tracking** — Resolve code → link referrer/referee → +500 coins + $20 with idempotency  
5. **Coin/cash calculations** — Aggregates from ledger; milestone progress helpers (2,500 / 3,000)  
6. **Email automation** — Outbox row → Resend welcome with dashboard + referral link  
7. **Dashboard data** — Tokenized URL returning profile, balances, referrals, milestones, geo  
8. **Location** — IP extract + provider lookup + hashed IP storage  
9. **Admin/reporting** — Counts, top referrers, coins/cash totals, country breakdown  
10. **Future migration** — Keep ledger/referrals immutable; swap auth; promote waitlist users into app accounts  

**Bonus delivered in this demo:** lightweight admin strip, anti-fraud probes, deployment-ready Next.js app, and this documentation.

---

## Deliverables checklist

- [x] Backend architecture  
- [x] Database schema  
- [x] Reward & referral logic  
- [x] Email automation setup (Resend + mock)  
- [x] User tracking & location capture  
- [x] API endpoints  
- [x] Dashboard-ready data  
- [x] Documentation / proposal  
- [x] Internal admin metrics surface  
- [x] Anti-fraud / duplicate-referral logic  
