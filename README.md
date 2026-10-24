# Prelaunch Engine

Interactive MVP demo of a **fintech waitlist + referral + rewards** backend — built to accompany a job proposal.

## Live surfaces

| Route | Purpose |
|-------|---------|
| `/` | Pitch + CTAs |
| `/demo` | One-click simulate signup, live SSE feed, referral tree, ledger, admin metrics |
| `/proposal` | Answers to the nine proposal questions |
| `/dashboard/[token]` | User dashboard (from welcome email link) |
| `/join/[code]` | Public referral signup |

Full written proposal: [`PROPOSAL.md`](./PROPOSAL.md)

## Stack

- Next.js (App Router) + TypeScript
- Prisma + SQLite (local) / Turso libSQL (optional prod)
- Resend (optional; mocks without API key)
- Framer Motion + SSE for the live demo

## Local setup

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo) and click **Simulate referred signup**.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed demo users + referral chain |
| `npm run db:seed-file` | Refresh `prisma/demo-seed.db` for Vercel `/tmp` bootstrap |

## Environment

See `.env.example`. Important vars:

- `DATABASE_URL` — local SQLite
- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — persistent prod DB on Vercel
- `RESEND_API_KEY` — real welcome emails
- `NEXT_PUBLIC_APP_URL` — absolute links in emails / referral URLs

Without Turso on Vercel, the app copies `prisma/demo-seed.db` into `/tmp` (ephemeral but enough for recruiter demos). Prefer Turso for persistence.

## Reward rules (implemented)

| Event | Reward |
|-------|--------|
| Signup | +100 coins + unique referral code |
| Profile complete (once) | +400 coins |
| Successful referral | +500 coins + $20 cash to referrer |
| Milestones | 2,500 → 2 mo premium · 3,000 → 3 mo premium |

Anti-fraud: unique email, no self-referral, unique referee, ledger idempotency keys.

## Deploy (Vercel)

Repo: https://github.com/Odelf18/prelaunch

**Option A — CLI (fastest)**

```bash
npm i -g vercel
vercel login
vercel --prod
```

Then in the Vercel project settings, set:

- `NEXT_PUBLIC_APP_URL` = `https://<your-deployment>.vercel.app`
- (Recommended) `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` for persistent DB  
  Without Turso, the app bootstraps from `prisma/demo-seed.db` into `/tmp` (fine for demos; resets on cold starts).

**Option B — Dashboard**

1. Import https://github.com/Odelf18/prelaunch in [vercel.com/new](https://vercel.com/new)
2. Set the env vars above
3. Deploy — share `/demo` + `/proposal` in your application
