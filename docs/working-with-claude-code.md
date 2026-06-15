# How to Work with Claude Code on This Project

A pragmatic guide for getting good output from Claude Code, written for someone who's "cukup bisa" with development.

## Day 1: First session

After cloning/scaffolding the project:

```bash
cd sustainable-5r-shadow
claude
```

When Claude Code opens, your first message should be:

> Read `CLAUDE.md` and `docs/roadmap.md`. Then read `docs/decisions.md`.
>
> Once you've read them, summarise the project in 3 bullets so I can verify you understood the constraints. Don't write code yet.

This forces Claude to load the rules into its context BEFORE doing anything. If its summary is wrong, correct it before continuing.

## Day 1: Module 0 (Foundation)

Next message:

> Build Module 0 from the roadmap (Foundation). Before writing any code, outline the plan in 5-8 bullets and wait for my "go".

When the plan comes back:
- Read it. Does it match what `docs/roadmap.md` says?
- Does it include the scoring engine? It shouldn't (that's Module 1).
- Does it include things you didn't ask for? Push back.

If the plan is OK: reply "go". If not: tell Claude what to change.

## The golden loop

For every feature:

1. **Plan first.** *"Plan Module X first. No code."*
2. **Review the plan.** Reject anything outside scope.
3. **Approve.** *"Go."*
4. **Read what was changed.** Don't trust blindly — open the files Claude touched.
5. **Run it.** `npm run dev`, click around, try to break it.
6. **Run checks.** `npm run typecheck && npm test && npm run lint`.
7. **Commit.** Small commits per module. (See "git workflow" below.)

This loop sounds slow but it's actually fast because you catch issues early.

## When Claude Code is doing well

You can tell by these signs:
- It asks one focused question rather than guessing.
- It reads files before changing them (`Read` tool calls).
- It runs `npm run typecheck` after changes without being asked.
- It summarises what it did in 2-3 bullets, not a wall of text.

When you see this, let it flow. Don't micromanage.

## When Claude Code is going off-rails

Red flags:
- Generates 500+ lines of code in one go without checking in.
- Introduces a new dependency you didn't approve.
- Changes the scoring formula even slightly.
- Adds a feature not in the current module's checklist.
- Writes `any` types in TypeScript.
- Edits `CLAUDE.md` without you asking.
- Ignores the "Bahasa Indonesia for UI" rule.

When you see this:
1. **Stop it immediately.** Hit Ctrl+C if needed.
2. **Revert.** `git checkout .` to undo everything since last commit.
3. **Diagnose.** Ask Claude: *"What did you just do, and why did you ignore CLAUDE.md section X?"*
4. **Reset context.** `/clear` and start the module again.

This is why frequent commits matter. They're your insurance.

## Common mistakes (yours, not Claude's)

### Mistake 1: Vague requests

Bad: *"Make the audit page better."*

Good: *"On the audit page (`app/(app)/audit/page.tsx`), the filter chips at the top should be sticky on scroll. Also, the empty state currently says 'No audits' in English — change to 'Belum ada audit' per the language rule."*

Specific = good output. Vague = guesses.

### Mistake 2: Accepting plans you don't understand

If Claude proposes a plan and you don't understand a bullet, **ask**. *"Bullet 3 says 'add a middleware for RBAC' — explain in plain language what that means and where the code goes."*

You should be able to explain back what Claude is about to build.

### Mistake 3: Letting the context window get too full

After 1-2 hours of work, Claude's context fills up with old messages. It starts forgetting things. When you notice it:
- Asking questions it should know from `CLAUDE.md`
- Repeating itself
- Going in circles on the same bug

→ Save your progress, commit, then run `/clear` and start a fresh session. Re-read `CLAUDE.md` and tell it what you were working on.

### Mistake 4: Not running the app

It's tempting to keep coding while Claude works. **Don't.** After every module, **stop and use the app** as different roles. Half the bugs you'll find this way; half via tests.

## Git workflow

```bash
# at the start of each module
git checkout -b module-X-description

# commit often within the module
git add . && git commit -m "module 3: scoring engine + tests"
git add . && git commit -m "module 3: score overview page"
git add . && git commit -m "module 3: score detail page with breakdown"

# when module is done
git checkout main
git merge module-X-description
```

If something goes catastrophically wrong: `git reset --hard HEAD~1` to throw away the last commit.

## Useful Claude Code commands

- `/clear` — wipe the conversation, fresh context. Use after each module.
- `/init` — analyse the project and update CLAUDE.md (don't run blindly; review the diff).
- `/compact` — summarise the conversation to save context. Use when you want to keep going but the chat is getting long.

## Stuck? The escalation ladder

When you hit a wall:

1. **Read the actual error.** 80% of the time the error message tells you the answer.
2. **Search the error online.** Stack Overflow / GitHub issues.
3. **Ask Claude Code with context:** *"I'm getting [paste exact error]. I ran [command]. Last working state was [describe]. Diagnose, propose a fix, wait for OK."*
4. **Reset and retry.** If a feature is fighting you for 30+ minutes, throw it away (`git checkout .`) and rebuild it differently.
5. **Skip it.** Some features aren't worth fighting for in a shadow build. Note it in `docs/roadmap.md` and move on.

## Sanity check at the end of every session

Before closing the laptop:
- [ ] All changes committed? (`git status` should be clean)
- [ ] `npm run typecheck` passes?
- [ ] `npm test` passes?
- [ ] The app actually runs? (`npm run dev`)
- [ ] Did I update `docs/decisions.md` if I made any non-obvious choice?

If yes to all → close laptop with a clear head.

## When in doubt

The rule from `CLAUDE.md` applies: simpler, more aligned with existing patterns, easier to throw away if wrong. That's almost always the right call for a shadow build.

You're building this to validate ideas, not to win an engineering award. Lean into "good enough".
