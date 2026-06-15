# Technical Decisions Log

A running log of "we considered X, chose Y, because Z" decisions. Append-only. The intent is that the next person reading this codebase (including future-you) understands the *why*, not just the *what*.

Format:

```
## YYYY-MM-DD — Title
**Context:** what problem / situation
**Options considered:** A, B, C with one-line summaries
**Decision:** chose X
**Rationale:** why
**Consequences:** what this means going forward
```

---

## 2026-06-15 — Initial stack choice: Next.js + SQLite + Prisma

**Context:** Shadow build for a 5R audit application. Single developer. Demo-focused. Must run on a personal laptop without infrastructure setup.

**Options considered:**
- Next.js + SQLite + Prisma (chosen)
- Next.js + PostgreSQL (Docker) + Prisma — production-grade but adds setup friction
- Vite + React SPA + JSON Server — lightest but doesn't match the eventual IT architecture
- Create React App + Express + Mongo — outdated, no good reason

**Decision:** Next.js 14 (App Router) + SQLite + Prisma.

**Rationale:** SQLite removes all infra setup; Prisma migrates trivially to Postgres later if needed; Next.js matches the likely IT stack closely enough that lessons learned transfer. App Router + Server Components keep the frontend simple.

**Consequences:** No concurrent writes at scale (fine for one user demo). No Docker. Easy to deploy to Vercel later if needed. Database is a file at `prisma/dev.db` — easy to delete and reset.

---

## 2026-06-15 — Mock auth, not real auth

**Context:** Shadow build needs login by role but doesn't need actual security.

**Decision:** Mock auth via email prefix → role mapping. Cookie-based session, no password validation.

**Rationale:** Real auth (NextAuth + provider) adds setup time and doesn't change anything about the demo. The login flow is realistic enough for stakeholders.

**Consequences:** This codebase is NOT safe to deploy publicly. Demo only. If anyone wants a hosted version, switch to NextAuth + a real provider first.

---

## 2026-06-15 — Scoring formula lives in ONE pure function

**Context:** Earlier prototypes had scoring math scattered across components and routes. Finance verifies scores against manual calculation; any deviation is a real problem.

**Decision:** `lib/scoring.ts` exports a single pure function. Every place that needs a score calls it. The 17/3/1/21 → 86% worked example is a unit test that runs on every commit.

**Rationale:** Single source of truth. If the formula ever needs to change (see Open Question OQ-01 in BRD), one file changes.

**Consequences:** Reviewers should reject any PR that does scoring math anywhere else.

---

## 2026-06-15 — Audit and Daily Checklist use SEPARATE question sets

**Context:** Initial drafts of the BRD and early planning treated "guiding questions" as a single concept and conflated Audit findings with Daily Checklist items. Two source documents clarify they are different:
- `v0_Guiding_Questions.xlsx` — 27 sub-categories across 5 R principles, used by Auditors during monthly cross-area audits.
- `Application_Documentation.pdf` (AppSheet) — 14 Refinery items + 10 Fractionation items, used by PIC Areas as daily self-checks per shift.

**Options considered:**
- Merge into one question bank with a tag for context — rejected; the two flows have different actors, frequencies, and outcomes; merging would force artificial alignment.
- Keep separate (chosen).

**Decision:** Audit and Daily Checklist remain two completely separate features with separate data, separate forms, separate seed sets, and separate scoring.

**Rationale:** That is how the business actually operates. The Audit Guiding Questions are the official 5R taxonomy from Guidelines v.2. The Daily Checklist items are operational self-checks crafted per area by the floor PICs. Forcing them into one model would distort both.

**Consequences:** 
- Two separate Prisma models: `GuidingQuestion` (for audit findings) and `ChecklistItem` (for daily checklist).
- Seed includes 27 guiding questions and 24 checklist items (14 Refinery + 10 Fractionation). Other areas have no items yet — committee needs to define them.
- This closes Open Question OQ-03 in BRD v3.0 (format of guiding questions) — the format is the dropdown bertingkat already defined in the Guidelines.

---

## 2026-06-15 — Module 0: Prisma 6 (not 7), RBAC map, and nav overflow

**Context:** Scaffolding Module 0 (Foundation). A few choices weren't spelled out in CLAUDE.md.

**Decisions:**
1. **Pinned Prisma to v6** (`prisma@6`, `@prisma/client@6`). Prisma 7 removes the `url` field from `schema.prisma` and requires a driver adapter for SQLite, which adds friction and diverges from the classic `DATABASE_URL` flow assumed in `docs/setup-instructions.md`. v6 keeps `url = env("DATABASE_URL")` and a plain `PrismaClient()` — simpler, and trivially upgradable later.
2. **RBAC is a single source-of-truth map** in `lib/rbac.ts` (`SECTION_ACCESS: Record<Section, Role[]>`) plus `canAccess()` / `navForRole()` / `sectionForPath()`. Middleware and UI both consume it; no inline `role === "admin"` checks. Unit-tested.
3. **Mobile bottom nav overflow** — roles with >5 sections (komite, admin) show the first 4 items plus a "Lainnya" button that opens a bottom sheet with the rest. Avoids building a full drawer for Module 0 while honouring the "bottom nav on mobile" rule.
4. **Stub pages** created for all nav targets (audit, capa, checklist, redtag, scores, schedule, reports, documents, admin) using a shared `Placeholder` component, so navigation and RBAC 403 are demonstrable now. These get replaced module by module.

**Rationale:** Keep Module 0 simple, verifiable, and aligned with the roadmap's "demo-ready fast" principle.

**Consequences:** When a later module needs Postgres or Prisma 7, revisit decision 1. The `SECTION_ACCESS` map is the place to change any access rule.

---

## 2026-06-15 — Module 2: form state API, photo storage, finding distribution

**Context:** Building Audit input. Stack is Next.js 14 + React 18.

**Decisions:**
1. **`useFormState` / `useFormStatus` (react-dom), not `useActionState`.** `useActionState` is a React 19 API and throws on this React 18 stack. Server-action forms use `useFormState` for return state and a `useFormStatus`-based `SubmitButton` for pending. (Login uses `useTransition` + a manual action call.)
2. **Photo storage = `public/uploads/`** via `lib/upload.ts` (`savePhoto`), filename `randomUUID()`. Shadow-build only; production would use object storage. Folder is git-ignored. Server Action body limit raised to 12mb in `next.config.mjs` for camera images.
3. **Photo input supports camera AND gallery** (rule 5): one `<input type=file accept=image/*>` with two triggers — "Kamera" toggles `capture=environment`, "Galeri" omits it.
4. **No minimum-finding-count rule** (rule 2) — `submitAudit` locks the audit and `updateMany` sets all findings to `PENDING_CAPA` regardless of count, distributing them to the area PIC.
5. **Findings reference `GuidingQuestion`** (the 27-item taxonomy) rather than duplicating pillar/sub-category strings; the pillar is read via the relation.

**Rationale:** Match the installed React version, keep storage zero-infra, follow the explicit business rules.

**Consequences:** When upgrading to React 19 later, `useFormState`→`useActionState` is a mechanical swap. Photo files live outside git; a fresh clone starts with an empty uploads dir.

---

## 2026-06-15 — Module 3: CAPA model + auto-scoring recompute

**Context:** Closing the audit → CAPA → score loop.

**Decisions:**
1. **`Capa` is 1:1 with `Finding`** (`findingId @unique`). Fields: rootCause, correctiveAction, preventiveAction (two separate text fields), single `afterPhoto` (rule 4), dueDate, status `DONE|PROGRESS|NO_PROGRESS`. No dispute step (rule 3).
2. **Score recompute counts only findings that HAVE a CAPA** for the area+period; findings still `PENDING_CAPA` are "not yet evaluated" and excluded. `recomputeAreaScore()` calls the one `calculate5RScore()` engine and upserts `Score`. Runs on every CAPA save.
3. **Seeded scores stay for areas without CAPA.** Recompute only overwrites the area being acted on, so the overview shows seeded baselines plus live-computed values. (Verified: REF-2 went 95%→33% after 1 Done/1 Progress/1 No Progress.)
4. **`scores` section excluded from auditee RBAC** — PIC fills CAPA but views scores via komite/management/auditor/admin. PIC verifying their own score isn't part of the flow.
5. **Seed adds a submitted REF-2 audit + 5 findings** so the PIC has a CAPA inbox out of the box.

**Rationale:** Make the scoring loop demonstrable and correct, with the formula in exactly one place.

**Consequences:** "Komite verify CAPA" (a separate approval step) is noted in the roadmap but not built — current flow recomputes immediately on PIC save.

---

## 2026-06-15 — Module 4: Daily Checklist (separate from Audit)

**Context:** Daily self-check per shift by the area PIC. Rule 6: completely separate from Audit.

**Decisions:**
1. **Separate models** `ChecklistItem` / `ChecklistRun` / `ChecklistResponse` — no shared tables or questions with audit. Items scoped to parent `AreaGroup` (Refinery/Fractionation); each floor inherits its group's items. Seeded 14 Refinery + 10 Fractionation verbatim.
2. **Run keyed by `(areaId, date, shift)`** (unique). Re-submitting upserts the run and replaces its responses. Score = round(% compliant). Warning shown when score < 90% (threshold from CLAUDE.md).
3. **Per-item optional note + photo** only when "Tidak Sesuai" (revealed client-side); photos saved via the same `savePhoto` helper.
4. **History = simple list** (date · shift · score). The month-calendar view in the roadmap is "nice to have" and deferred.
5. **Non-PIC / area-without-group** see an info message instead of a form (Storage, Loading Bay, etc. have no items yet — committee must define them).

**Rationale:** Honour the hard separation rule, keep submission idempotent per shift, stay in scope.

**Consequences:** Areas without a parent group cannot run a checklist until items are defined. Calendar history can be added later without schema changes.

---

## 2026-06-15 — Module 5: Red Tag

**Context:** Registration → coordinator disposal decision, with QR and deadlines.

**Decisions:**
1. **`RedTag` model** with `tagNumber` `RT-YYYY-NNN` generated on create (count of that year's tags + 1, zero-padded). `registeredAt` is a dedicated field (default now, override-able in seed) so urgency can be backdated for demos; `dueDate` = registeredAt + retention.
2. **Retention by location:** `IN_AREA` 30 days, `RT_AREA` 90 days (`RETENTION_DAYS` in `lib/redtag.ts`).
3. **Status = `OPEN` → `INTERNAL`/`EXTERNAL`/`DISPOSED`.** Only `kord_red_tag`/`admin` may decide, and only while `OPEN`. Auditee/PIC can register.
4. **Urgency** computed at render from `dueDate` vs now (overdue / ≤7 days approaching / else ok); `decided` tags show "Selesai". Drives the list filter chips and auto-flag colours.
5. **QR via `qrcode.react`** (`QRCodeSVG`) encoding the tag number, on the detail page.

**Rationale:** Self-contained module; deadlines and QR make it demo-tangible.

**Consequences:** Tag numbering is per-calendar-year and not gap-safe (deletions would leave gaps) — fine for a shadow build.

