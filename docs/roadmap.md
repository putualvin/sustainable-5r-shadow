# Roadmap — Build Order

The principle: **demo-ready as fast as possible**. The first 3 modules should be enough to show a working audit-to-score flow. Everything else is depth.

## Module 0 — Foundation (1-2 sessions)

Goal: a Next.js app that boots, has the design system in place, and can route between pages.

- [ ] Scaffold Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] Install deps: prisma, @prisma/client, lucide-react, recharts, qrcode.react, react-hook-form, zod, date-fns, zustand
- [ ] Configure Tailwind with Sinar Mas color tokens (see CLAUDE.md)
- [ ] Set up Prisma with SQLite; create initial schema (User, Area)
- [ ] Mock auth: login page + middleware + session via cookie
- [ ] App shell: sidebar (desktop) / bottom nav (mobile) with role-aware menu
- [ ] Empty Home page that shows logged-in user identity
- [ ] `lib/rbac.ts` with role check helpers
- [ ] **First test:** `lib/rbac.ts` has unit tests
- [ ] Seed 7 mock users (one per role) and 12 areas

**Done when:** you can log in as any role and the menu reflects that role's access.

## Module 1 — Scoring engine + Home dashboard (1 session)

Goal: the scoring math is correct and visible somewhere.

- [ ] `lib/scoring.ts` — pure function `calculate5RScore({ done, progress, noProgress })` returning the breakdown
- [ ] **Unit test:** the 17/3/1/21 → 86% worked example (this is non-negotiable)
- [ ] Seed score data for 12 areas with varied realistic scores (65%-95%)
- [ ] Home dashboard KPI cards: Skor 5R, Daily Checklist, Open CAPA, Red Tag
- [ ] Quick-access menu cards to all modules (stub pages OK)

**Done when:** logging in shows a home page with real KPIs sourced from the database.

## Module 2 — Audit input (2-3 sessions)

Goal: an auditor can create an audit and add findings.

- [ ] Extend Prisma schema: AuditSchedule, Audit, Finding
- [ ] Audit list page (filtered by role: auditor sees own, komite sees all)
- [ ] Create audit form: select area from schedule
- [ ] Add findings repeatedly: 5R category, sub-category (guiding question), specific area, description, photo
- [ ] Photo input MUST support BOTH live camera AND gallery upload
- [ ] Save draft (auto-save every 30s) + Submit final (no minimum count rule)
- [ ] On submit final: distribute to area's PIC (status → "Pending CAPA")
- [ ] Toast notification on distribute

**Done when:** auditor1@5r.local can create an audit with several findings + photos and submit it, and pic.refinery2@5r.local sees those findings in their inbox.

## Module 3 — CAPA + Auto-scoring (2 sessions)

Goal: complete the audit → CAPA → score loop.

- [ ] CAPA model + form (root cause, corrective, preventive, ONE after-photo, due date, status)
- [ ] No dispute step — direct from finding to CAPA
- [ ] Status: Done / Progress / No Progress
- [ ] On status change, recalc area's score using `lib/scoring.ts`
- [ ] Score Overview page: 12 area cards in Sinar Mas red, badges (EXCELLENT/GOOD/etc.)
- [ ] Score Detail page (click a card): full calculation breakdown table, pie + trend charts
- [ ] Print-ready signature block at bottom of detail page

**Done when:** filling CAPAs for an audit updates the score in real-time, and the Score Overview reflects it correctly per the formula.

## Demo checkpoint — Modules 0-3

At this point you have a working demo. Stop, run through the full flow as different roles, polish, and show it to one or two stakeholders for feedback **before continuing**.

## Module 4 — Daily Checklist (1-2 sessions)

- [ ] Checklist items per area (15 realistic items for refinery context)
- [ ] Daily checklist form: per area per shift (1/2/3), checkbox + optional photo if non-compliant
- [ ] Daily score calculation; notification if < 90%
- [ ] History view: monthly calendar coloured by status
- [ ] Reminder banner (simulated 15:00/16:00 escalation)

## Module 5 — Red Tag (1-2 sessions)

- [ ] Registration form: photo, name, category, reason, location (in-area 30d / RT Area 90d)
- [ ] Auto-generate tag number (RT-2025-XXX) and QR code (qrcode.react)
- [ ] List with filter chips (deadline urgency)
- [ ] Detail page with countdown + status timeline
- [ ] Approval workflow for Koordinator (internal/external/disposal)
- [ ] Auto-flag items approaching/past deadline

## Module 6 — Monthly report (1 session)

- [x] Report page: executive summary, KPIs, trend chart, per-area table, top categories, compliance donut
- [x] Recurring findings panel (keyword/category matching — keep it simple)
- [x] Auditor & PIC ranking
- [x] Print to PDF works

## Module 7 — Schedule, Documents, Admin (1-2 sessions)

- [x] Audit schedule calendar (komite can auto-generate + shuffle)
- [x] Document repository with categories and version badges
- [x] Admin: user/role management table
- [x] Audit log of all actions

## Module 8 — Polish (1 session)

- [x] Responsive check on real mobile (use ngrok or Vercel preview)
- [x] Empty/loading/error states everywhere
- [x] 403 page for unauthorised access
- [x] Offline banner + localStorage write for audit/checklist when offline
- [ ] Lighthouse pass (aim for >90 on Performance, Accessibility) — not run in this environment

---

## How to estimate your own pace

Each "session" above is ~2-3 hours of focused work with Claude Code. Numbers in parentheses are realistic for someone who is "cukup bisa" with development.

**Aggressive timeline (demo in 3 weeks):** Module 0 (week 1), Module 1+2 (week 2), Module 3 (week 3) — demo checkpoint.

**Realistic timeline (demo in 5-6 weeks):** Modules 0-3 spread across 5-6 weeks at 2-3 evenings per week.

**Full feature parity (3-4 months):** All 8 modules at the same pace.

---

## When to stop

This is a shadow build. You stop when:
- IT's official version is good enough that this becomes redundant (great outcome — celebrate)
- Stakeholders have validated the design and moved focus to IT's delivery (also great)
- You've demonstrated whatever you needed to demonstrate

It is **OK** to not finish all 8 modules. Modules 0-3 alone prove the concept.
