# Setup Instructions — Start Here

Steps to get from "nothing" to "working dev server with Claude Code ready to build". Should take 30-45 minutes the first time.

## Prerequisites check

Open Terminal and run these. If any fail, install that thing first.

```bash
node --version    # should be v20.x or higher
npm --version     # should be 10.x or higher
git --version     # any recent version
claude --version  # should show Claude Code version
```

If `node` is missing or too old → install from https://nodejs.org (LTS version).
If `claude` is missing → see https://docs.claude.com/en/docs/claude-code/setup

## Step 1: Set up the project folder

```bash
# Pick where your code lives
cd ~/dev   # or wherever

# Create the project folder
mkdir sustainable-5r-shadow
cd sustainable-5r-shadow

# Initialize git
git init

# Copy the starter files (CLAUDE.md, README.md, docs/) into this folder
# (you should have them from the package I gave you)
```

After this step your folder should contain:
- `CLAUDE.md`
- `README.md`
- `docs/roadmap.md`
- `docs/decisions.md`
- `docs/working-with-claude-code.md`
- `docs/setup-instructions.md` (this file)

Make a first commit:

```bash
git add .
git commit -m "Initial: docs and CLAUDE.md before scaffolding"
```

## Step 2: Start Claude Code and let it scaffold

```bash
claude
```

When Claude Code opens, send this exact message:

> Read `CLAUDE.md`, `docs/roadmap.md`, and `docs/decisions.md`.
>
> Then scaffold Module 0 (Foundation) from the roadmap. Before writing code, give me a 5-8 bullet plan and the list of dependencies you'll install. Wait for my "go".

Review the plan. It should mention:
- Initialising Next.js 14 with TypeScript + Tailwind + App Router
- Installing the dependencies listed in CLAUDE.md (Prisma, shadcn/ui, lucide-react, recharts, qrcode.react, react-hook-form, zod, date-fns, zustand)
- Setting up the folder structure (app/, components/, lib/, prisma/, types/)
- Configuring Tailwind theme with Sinar Mas brand colors
- Creating the Prisma schema for User + Area
- Setting up mock auth (login route, middleware, session cookie)
- Building the app shell (sidebar / bottom nav)
- Seeding 7 mock users + 12 areas

If the plan looks right: reply "go". If anything is off, push back.

## Step 3: Verify the scaffold worked

After Claude Code finishes Module 0:

```bash
# Install dependencies (Claude should have run this, but to be safe)
npm install

# Set up the database
npx prisma migrate dev --name init
npm run db:seed

# Start the dev server
npm run dev
```

Open http://localhost:3000.

**You should see:** a login page. Try logging in with `auditor1@5r.local` (any password). You should land on a home page that says "Halo, [name]" or similar, with a sidebar/menu reflecting the auditor role.

If something is broken: paste the error to Claude Code and ask it to diagnose.

## Step 4: First commit of working code

```bash
git add .
git commit -m "Module 0: foundation — Next.js scaffold, mock auth, app shell"
```

## Step 5: Move to Module 1

In the same Claude Code session (or a fresh one after `/clear`):

> Now build Module 1 (Scoring engine + Home dashboard) from `docs/roadmap.md`. Same protocol: plan first, wait for go.

The critical thing in Module 1 is `lib/scoring.ts`. After Claude builds it:

```bash
npm test
```

The test for the 17/3/1/21 → 86% example MUST pass. If it doesn't, that's a bug — stop and fix it before continuing.

## Daily routine after that

1. Open terminal in project folder
2. `git pull` if you have multiple devices (optional)
3. `claude` to start Claude Code
4. Pick next item from `docs/roadmap.md`
5. Plan → review → go → run → commit
6. End of session: clean `git status`, all tests pass

## If you get stuck on setup

Common issues:

**`npm install` fails with EACCES or permission errors:**
You probably need to fix npm permissions. See https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

**Prisma can't find SQLite:**
Make sure `.env` has `DATABASE_URL="file:./dev.db"` (Claude should have created this).

**Next.js port 3000 already in use:**
Either kill the other process (`lsof -ti:3000 | xargs kill`) or run `npm run dev -- -p 3001`.

**Claude Code can't read files:**
You probably opened Claude Code from the wrong directory. Quit (`exit` or Ctrl+D), `cd` to the project folder, then re-run `claude`.

## You're set up. Now what?

Open `docs/working-with-claude-code.md` and read it once before your first real coding session. It's the most important doc in this package.

Then keep going module by module. Don't rush.
