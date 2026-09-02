# Sustainable 5R — Shadow Build

A shadow implementation of the Sustainable 5R digitalisation application, built as a working prototype alongside the official IT-developed version.

## What this is

A working web/mobile-responsive POC of the 5R audit system. Used for stakeholder demos, design validation, and as a reference implementation. **Not for production.**

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **PostgreSQL (Neon)** + **Prisma**
- **Vitest** for tests, **Playwright** for E2E (optional)

## Prerequisites

- Node.js 24+
- npm (comes with Node)
- PostgreSQL/Neon connection string
- A terminal (Mac Terminal / iTerm2 / Windows Terminal)

The public demo uses only dummy data. Do not connect this repository to a
database containing company or production data.

## Quick start

```bash
# 1. Clone or create the project (Claude Code will scaffold this)
cd ~/dev   # or wherever you keep code
# (Claude Code will create the folder)

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Replace DATABASE_URL with the demo Neon connection string.

# 4. Set up the demo database (run once, never during every build)
npm run db:setup:demo

# 5. Run the dev server
npm run dev
# Open http://localhost:3000
```

## Mock login (any password)

Login email determines the role you sign in as:

| Email prefix | Role you become |
|---|---|
| `admin@...` | Admin |
| `komite@...` | Komite Unit |
| `auditor@...` | Auditor |
| `pic@...` | Auditee / PIC Area |
| `redtag@...` | Koordinator Red Tag |
| `gm@...` | Management |

Examples: `auditor1@5r.local`, `pic.ref-2@5r.local`, `gm@5r.local`. Any password works.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type-check without building |
| `npm run check` | Lint + type-check + unit tests |
| `npm run audit:production` | Audit deployable runtime dependencies |
| `npm run verify:deploy` | Validate env + run all pre-deploy checks |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:setup:demo` | Sync schema safely and seed dummy data |
| `npm run db:seed` | Re-seed the database |

## Deploy to Vercel

The repository is configured for Vercel's standard Next.js Git deployment.
There is deliberately no database mutation in the build command.

1. Prepare Neon once with `npm run db:setup:demo`.
2. Import this GitHub repository into Vercel.
3. Add `DATABASE_URL` and `APP_MODE=demo` to Production and Preview.
4. Keep the framework preset and build command on their automatic defaults.
5. Verify `/api/health` returns `status: ok` after deployment.

See [`docs/deploy-vercel.md`](docs/deploy-vercel.md) for the full checklist.

## Project structure

See `CLAUDE.md` for the full conventions. Quick map:

```
app/             — Next.js pages (App Router)
components/      — UI components
lib/scoring.ts   — THE scoring engine (don't duplicate this logic anywhere)
lib/rbac.ts      — Role-based access helpers
prisma/          — Database schema and seed
docs/            — Decisions, roadmap, notes
```

## How to work with Claude Code on this project

1. **Open the project folder in your terminal**, then run `claude` to start Claude Code.
2. Claude Code reads `CLAUDE.md` automatically — that's where the business rules live.
3. Start with: *"Read CLAUDE.md and docs/roadmap.md, then build Module 1 (Foundation)."*
4. Work **one module at a time**. After each, run the app, click through, and verify the demo flow before moving on.
5. After every meaningful change: `npm run typecheck && npm test`.

See `docs/roadmap.md` for the build order.

## When something breaks

1. `npm run typecheck` — most issues are types
2. `npm run lint`
3. Clear the `.next` directory, then run `npm run dev` again
4. Run `npm run db:setup:demo` only when the demo schema or seed needs repair
5. Ask Claude Code: *"X is broken, here's the error: [paste]. Diagnose, propose a fix, wait for my OK."*

## Important reminders

- This is a **shadow build**. If IT's version is adopted, this one is a learning artifact, not a deliverable.
- **Never put real production data in this database.** Seed is fake.
- Business rules in `CLAUDE.md` are the source of truth — if Claude Code proposes something that contradicts them, push back.

## Status

This repository is in early-build state. See `docs/roadmap.md` for what's built and what's next.
