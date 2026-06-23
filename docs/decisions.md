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


---

## 2026-06-16 — Module 6: Monthly Report (read-only over existing data)

**Context:** Closing the roadmap's reporting module. Needed an executive monthly view without introducing new entities or touching the scoring/RBAC business rules.

**Decisions:**
1. **No schema change.** The report aggregates existing `Score`, `Finding`, and `Audit` rows. RBAC is unchanged — `reports` is already scoped to `komite_unit`/`management`/`admin` in `SECTION_ACCESS`.
2. **Aggregation helpers are pure** in `lib/reports.ts` (`averageScore`, `totalCapaStatuses`, `findingsByPillar`, `recurringFindings`) with unit tests (`lib/reports.test.ts`). The page (`app/(app)/reports/page.tsx`) is a Server Component doing direct Prisma reads, then delegating math to those helpers — no scoring math inlined (rule 1).
3. **Compliance donut + per-area table are driven by `Score`** (rich, all 12 areas), while the category bar and recurring panel are driven by `Finding` rows for the current period's submitted audits (sparse but real — only seeded REF-2 has findings). Honest empty states where data is thin.
4. **Seeded 2 prior months of `Score`** (idempotent upsert, `periodMonthsAgo`) so the trend line and "vs last month" deltas render meaningfully. Older months trend slightly lower → gentle upward trend.
5. **Print to PDF** reuses the existing `PrintButton` (`window.print()`); chart/cards print as laid out.
6. **Home KPIs wired up** — the stale "Segera (Module 3/4/5)" placeholders now show real counts: open CAPA (findings PENDING_CAPA not yet Done), active Red Tags (status OPEN), and average Daily Checklist compliance this period.

**Rationale:** Maximise demo value at minimal risk — no business-rule or schema changes, all logic in one tested place.

**Consequences:** "Top categories" / "recurring findings" stay thin until more audits are submitted (real or seeded). PIC ranking is represented by the per-area score table (sorted desc) rather than a separate widget; auditor ranking is a dedicated activity list.

---

## 2026-06-16 — Deploy: Vercel + Neon, schema push & seed run during build

**Context:** Stakeholder wanted a live URL. App is Next.js 14 + Prisma on PostgreSQL (Neon). The shadow-build sandbox's network policy blocks outbound Postgres (port 5432), so `prisma db push` / seed can't run from the build container — but Vercel's build/runtime reach Neon normally.

**Decision:** `vercel.json` sets `buildCommand` to `prisma generate && prisma db push && tsx prisma/seed.ts && next build`. `DATABASE_URL` is supplied as a Vercel build+runtime env var. Deployed via `vercel deploy --prod` (CLI).

**Rationale:** Runs the DB sync where the DB is reachable. The seed is idempotent (upserts + count guards), so re-running on each deploy is safe.

**Consequences:**
- Every production deploy re-syncs the schema and re-runs the seed. Seeded rows (areas/users/scores) are re-upserted, so a redeploy resets seeded scores (e.g. a recomputed REF-2 score returns to its seed tally). User-created rows (findings/CAPA/checklist runs/red tags beyond seeds) are NOT deleted. Fine for a demo; if a deploy must preserve live edits, drop `tsx prisma/seed.ts` from the build command first.
- Mock auth means the URL is a **public demo** — anyone with the link can log in as any role. Not for sensitive data.

---

## 2026-06-16 — Module 7: Schedule, Documents, Admin

**Context:** Final feature module. Three sub-areas, two new entities.

**Decisions:**
1. **Schedule** reuses the existing `AuditSchedule` model (no schema change). `generateSchedule` assigns active auditors round-robin across active areas (idempotent upsert per area+period); `shuffleSchedule` reassigns auditors via Fisher–Yates but **skips schedules whose audit already started** (so in-progress work isn't orphaned). Both are komite_unit/admin only; auditors view read-only. Period held in the URL (`?period=`), not state.
2. **Documents** — new `Document` model (`title`, `category` enum, `version`, optional `fileUrl`, `description`, denormalized `uploadedBy`). Repository groups by category with version badges. `fileUrl` may be an uploaded file **or** an external URL; the form recommends URLs because the serverless filesystem is ephemeral (uploaded files won't persist on Vercel — same limitation noted for photos). komite_unit/admin manage; everyone reads. Seeded 6 reference docs (files attached via UI).
3. **Admin** — users table with inline role change (`RoleSelect`, auto-submits) and active toggle. Guards prevent an admin self-demoting or self-deactivating (lockout safety). Admin only (`SECTION_ACCESS.admin`).
4. **Audit log** — new append-only `AuditLog` model with **denormalized** user name/email (survives user edits). `lib/audit-log.ts#logAction` is best-effort (never throws into the calling action). Wired into the Module-7 mutations (schedule generate/shuffle, document add/delete, role/active changes) plus `submitAudit`. Coverage is the meaningful mutations, not literally every write — more call sites can be added later. Seeded 3 example entries so the log isn't empty.

**Rationale:** Maximise coverage of the roadmap at shadow-build depth without touching the documented business rules (scoring/RBAC rules unchanged; role *data* is editable, the access *map* is not).

**Consequences:** New tables (`Document`, `AuditLog`) are created by the deploy's `prisma db push`. The seeded REF-2 audit has no `scheduleId`, so it shows as "Belum mulai" on the schedule grid (status there is keyed by schedule-linked audits) — cosmetic only.

---

## 2026-06-16 — Module 8: Polish (offline, loading/error states)

**Context:** Final polish pass. Headline item is business rule #7 (offline-capable audit input + daily checklist), previously unimplemented.

**Decisions:**
1. **Offline banner** — global `OfflineBanner` (client) mounted in the `(app)` layout. Listens to `online`/`offline` events + initial `navigator.onLine`; shows a sticky warning banner ("Mode offline — akan disinkronkan") with `role="status"`. Verified via Playwright `setOffline`.
2. **Local draft persistence** — `lib/use-local-draft.ts` (`useLocalDraft`) persists form state to localStorage and restores on mount, so input survives reload, back/forward nav (rule #8), and going offline (rule #7). Applied to the audit **AddFindingForm** (made fields controlled, keyed by `auditId`) and the **ChecklistForm** (compliant map + notes, keyed by area+date+shift). Real server sync is deferred per the rule ("simulate via localStorage").
   - Gotcha fixed: the persist effect must be gated on a `restored` **state flag** (not a ref), else the first persist pass writes the initial value back over the saved draft. Caught by a Playwright reload test (93% survived reload).
3. **Loading states** — one `(app)/loading.tsx` renders a shared `PageSkeleton`, covering every authenticated route's data fetch via the App Router Suspense boundary.
4. **Error states** — `(app)/error.tsx` client boundary with a Bahasa message + "Coba lagi" (reset). 403 page already existed.

**Consequences:** Photos aren't included in localStorage drafts (binary, optional). Lighthouse was **not** run in this environment (no headful Chrome profile/CI lane) — left unchecked in the roadmap; basic a11y (aria-live banner, sr-only skeleton label, button labels) is in place.

---

## 2026-06-16 — Multi-role users (RBAC: roles[] instead of a single role)

**Context:** In real 5R operations one person can be both an **auditor** (inspecting other areas) and an **auditee/PIC** (responsible for their own area). The original model gave each `User` a single `role`, so this wasn't expressible.

**Decision:** Adopt standard set-based RBAC.
1. `User.role: Role` → `User.roles: Role[]` (Postgres enum array; default `[auditee]`). Access is the **union** of all roles' permissions.
2. `lib/rbac.ts`: `canAccess(roles, section)` (any role grants), `navForRoles`, `hasAnyRole`, `emailToRoles`, `rolesLabel`. "PIC of an area" stays modelled as `areaId` (an assignment), separate from roles.
3. **Edge middleware** can't query the DB, so roles are written to a `session_roles` cookie at login (resolved from the DB user, or the email prefix for virtual users). `getCurrentUser` remains DB-authoritative; middleware is the coarse gate. Trade-off: an admin changing someone's roles is reflected in middleware only after that user re-logs in — but the page layer (DB) is authoritative, so it can't grant more than allowed.
4. **Conflict of interest:** `generateSchedule`/`shuffleSchedule` never assign an auditor to audit their own area (`auditor.areaId === area.id` is skipped).
5. **Admin UI:** single-role `<select>` → multi-select chips (`RolesSelect`) calling `setUserRoles`. Self-lockout guard now checks the *resulting set* still includes `admin`.
6. **Demo:** PIC Fraksinasi Lt 1 (`pic.fra-1@5r.local`) holds `[auditee, auditor]` to showcase multi-role.

**Consequences:**
- Requires PostgreSQL (enum arrays aren't supported on SQLite), so the local SQLite preview path no longer applies to this feature — verification is via unit tests (RBAC, no DB) + build + the live Neon deploy.
- The deploy's `prisma db push` now uses `--accept-data-loss` (dropping the old `role` column); the idempotent seed repopulates all users, so no meaningful data is lost in this shadow build.
- Diverges from the single-role model implied in CLAUDE.md — an intentional enhancement; the 6 roles and the `SECTION_ACCESS` map are unchanged.

---

## 2026-06-16 — CAPA status is set by Komite Unit (verification), not the auditee

**Context:** Business correction from the owner: the auditee/PIC fills the CAPA *plan*, but the **closing status** (Done / Progress / No Progress) — which drives the score — is the **Komite Unit's** decision during verification. The shadow build had previously let the auditee pick the status directly.

**Decision:**
1. `Capa.status` is now **nullable** (`CapaStatus?`); null = "Menunggu Verifikasi". Added `verifiedAt` + `verifiedBy` (denormalized).
2. **Auditee** form (`fillCapa`) no longer has a status field — only root cause, corrective, preventive, due date, after-photo.
3. **Komite/admin** verify via a new `verifyCapa` action (3 status buttons on the CAPA detail). Verifying sets the status + verifier + timestamp and **recomputes the area score**.
4. **Score counts only VERIFIED CAPAs** (`recomputeAreaScore` filters `capa.status != null`). Unverified CAPAs are "not yet evaluated".
5. **Lock after verification:** once Komite verifies, the auditee can no longer edit that CAPA (`fillCapa` rejects an edit when `status != null`); the detail page shows it read-only. (Per the owner: a verified CAPA isn't edited; scoring stands on it.)
6. **Inbox** is role-aware: auditee sees *Perlu Diisi / Menunggu Verifikasi / Terverifikasi*; Komite sees a *Menunggu Verifikasi* action queue + *Terverifikasi* + *Belum Diisi Auditee*.

**Consequences:** Recompute is now triggered by Komite verification (not auditee save) — matching the real workflow. Seed gives REF-2 two filled-but-unverified CAPAs so the Komite queue is non-empty. This realises the "Komite verify CAPA" step previously deferred in the Module 3 note.

---

## 2026-06-16 — CAPA → Red Tag link

**Context:** A finding's follow-up can be to red-tag an item (esp. Ringkas/Sort findings). The owner asked for a full data link between CAPA and Red Tag.

**Decision:** `RedTag.findingId` (optional, `onDelete: SetNull`) links a red tag to the finding/CAPA it came from; `Finding.redTags` is the back-relation.
- From the CAPA detail, the PIC/admin can "Daftarkan" a red tag → `/redtag/baru?findingId=…`, which pre-fills the area, shows the source finding, and stores the link. On save it returns to the CAPA (`?redtag=1`).
- The CAPA detail lists linked red tags (number + status); the Red Tag detail links back to its source finding.
- `createRedTag` anchors the area to the finding's area when raised from a finding (consistency). Auditees may only raise from a finding in their own area.

**Consequences:** Scoring is untouched — the link is informational/navigational. Seed links one REF-2 red tag to the "Material/Suku cadang" finding to demo the flow.

---

## 2026-06-16 — Re-baseline to BRD-aligned CLAUDE.md (align existing app)

**Context:** Owner replaced CLAUDE.md with a more detailed, BRD-aligned spec ("lupakan semuanya") and chose to **align the existing app** (not restart) and **keep PostgreSQL/Neon** (not SQLite).

**Documented deviations from the new spec (approved):**
- **DB = PostgreSQL (Neon)** instead of SQLite, so the demo stays deployable/live.
- **Multi-role users (`roles[]`)** instead of one role per user, because one person can be Auditor + Auditee in the field. Access = union; demo login still works.

**Alignment backlog (do gradually, scoring is the heart):**
1. Scoring two-layer (§5.4): keep Nilai Utama (existing engine), add `Score Akhir = Nilai Utama − Temuan Berulang − Parking Lot`; validate April-2026 baseline (0→100.0, 1→99.0, 5→95.0). Needs `Score.nilaiUtama/temuanBerulang/parkingLot/scoreAkhir` + `Finding.isRecurring`.
2. `Finding.kategori` LOW/HIGH (auditor records category, not status) (§5.1).
3. Follow-up: `woScPoNumber` required when Komite sets Progress (§5.2/5.3); FU limit 25/area/month + 17.00 cut-off.
4. Target 21 (20+1) framing in audit UI (§5.1) — no minimum-20 rule.
5. Auditor scoring, 4 components @25% (§5.5).
6. Role switcher demo (§4).
7. Brand red → #E30613 (§3).
8. Keep Daily Checklist & Red Tag OUT of Score Akhir (already true).

**Open question (blocks scoring):** the numeric weight of **Parking Lot** in Score Akhir (the baseline only exercises Temuan Berulang). Awaiting owner input.
