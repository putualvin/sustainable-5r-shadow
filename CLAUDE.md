# Sustainable 5R Application — Shadow Build

> This file is read automatically by Claude Code at the start of every session.
> It contains business rules, design decisions, and conventions that MUST be respected.
> When in doubt, re-read this file before making changes.

## Project context

This is a **shadow build** of a Sustainable 5R digitalisation application for Sinar Mas Agribusiness and Food (Downstream Indonesia, Operational Excellence). The official version is being built by the internal IT team — this shadow build serves as:
1. A working prototype for stakeholder demos and validation
2. A reference implementation to compare against IT's version
3. A POC to prove the design works end-to-end

**Domain:** "5R" is the Indonesian adaptation of the Japanese 5S methodology — Ringkas (Sort), Rapi (Set in order), Resik (Shine), Rawat (Standardize), Rajin (Sustain). The app digitises a monthly housekeeping audit cycle at a refinery (12 areas in pilot unit Refinery 2).

## Tech stack — DO NOT change without discussion

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** SQLite via Prisma ORM (file-based — `prisma/dev.db`)
- **State:** React Server Components by default; Zustand only when actually needed for client state
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Icons:** lucide-react
- **QR codes:** qrcode.react
- **Dates:** date-fns

Rationale: SQLite is intentional. This is a shadow build, not production. No Docker, no external services. Must run with `npm run dev` and nothing else.

## Critical business rules — NEVER violate

These rules come from real stakeholder decisions in meetings with Bu Ir (Business Owner), Pak Muhib (Auditor Coordinator), and Pak Halim (Committee). They are not suggestions.

### 1. SCORING FORMULA (this is the heart of the system — get it exactly right)

Each finding has one of three closing statuses: **Done**, **Progress**, or **No Progress**.

Weights: Done = +2, Progress = +1, No Progress = -1. Total weight = 2.

Formula:
```
donePct       = (countDone / countTotal) × 100
progressPct   = (countProgress / countTotal) × 100
noProgressPct = (countNoProgress / countTotal) × 100

valueDone       = (donePct / 100) × 2
valueProgress   = (progressPct / 100) × 1
valueNoProgress = (noProgressPct / 100) × -1

finalScore = ((valueDone + valueProgress + valueNoProgress) / 2) × 100
// then round to nearest integer
```

**Worked example (USE THIS AS A TEST):**
- 17 Done, 3 Progress, 1 No Progress, 21 total
- Done 81% × 2 = 1.62
- Progress 14% × 1 = 0.14
- No Progress 5% × (−1) = −0.05
- (1.62 + 0.14 − 0.05) / 2 = 0.855 → 85.5% → rounds to **86%**

**This formula must live in ONE pure function** at `lib/scoring.ts`, with the worked example as a unit test. Never inline this calculation elsewhere.

### 2. Findings: NO minimum count rule

There is **NO** "minimum 20 findings" requirement. Auditors submit however many quality findings they have. Earlier versions of this requirement existed; the team explicitly removed it. Do not re-introduce it as validation.

### 3. CAPA: NO dispute/sanggahan feature

After receiving a finding, the auditee goes **directly** to filling CAPA. There is no "dispute" button, no "sanggahan" workflow. Disputes happen verbally during the on-site audit, not in the app. Do not add a dispute step even if it seems "nice to have".

### 4. CAPA: ONE after-photo only

CAPA has a single "after" photo field, not multiple. Corrective action and preventive action are two separate text fields within the same CAPA form.

### 5. Photo upload: BOTH camera AND gallery

In flammable/diesel areas, phones are banned and photos are taken with an external explosion-proof camera. Therefore, **every photo input must support both** live camera capture AND upload from gallery/file. Never make camera the only option.

### 6. Audit and Daily Checklist are TWO DIFFERENT things — never mix them

This is the most commonly confused rule. Read carefully.

**Audit 5R** is a *monthly cross-area inspection* done by an Auditor on someone else's area. Findings are classified using **27 Guiding Questions** structured across the 5 R principles. Each finding picks one category (Ringkas/Rapi/Resik/Rawat/Rajin) then one sub-category. See section "Guiding Questions (Audit)" below for the full list.

**Daily Checklist** is a *self-check done daily per shift* by the area's own PIC. Each area has its own set of **area-specific yes/no questions** (e.g. "Apakah drip pan dalam kondisi bersih?"). See section "Daily Checklist items" below.

They share NO question sets. They have separate database tables, separate forms, separate scoring. When in doubt, ask: "Who fills this, how often?" — that tells you which is which.

### 7. Offline-capable for audit input and daily checklist

When network is unavailable, the user must be able to keep entering audit findings and daily checklist items. Data is saved locally and a banner shows "Mode offline — akan disinkronkan". For this shadow build, simulate this by writing to localStorage and showing the banner; real sync logic can be deferred.

### 8. Navigation: forward AND back, without losing data

This is a real bug found in an earlier prototype. Users must be able to navigate forward and back between pages without losing entered form data. Use proper Next.js navigation, persist form state appropriately.

### 9. Language

All UI text is in **Bahasa Indonesia**. Code identifiers, comments, file names, and database columns are in English. Error messages shown to users: Bahasa Indonesia. Logs and dev errors: English.

## Roles (RBAC)

Six roles. Enforce in middleware AND in UI (hide menus user can't access; return 403 page if URL accessed directly):

| Role | Bahasa label | Access |
|---|---|---|
| `admin` | Admin | User & role management, master data, audit log |
| `komite_unit` | Komite Unit | Verify CAPA, scoring, monthly reports, schedule, rankings |
| `auditor` | Auditor | Input audits, view schedule, view own area scores |
| `auditee` | Auditee / PIC Area | Receive findings, fill CAPA, daily checklist, register Red Tag |
| `kord_red_tag` | Koordinator Red Tag | Approve/reject Red Tag disposal decisions |
| `management` | Management | View-only dashboards |

For shadow build: mock login by email prefix. `admin@...` → admin, `komite@...` → komite_unit, `auditor@...` → auditor, `pic@...` → auditee, `redtag@...` → kord_red_tag, `gm@...` → management. Any password works.

## Areas (12 in pilot unit "Refinery 2")

Refinery Lt 1, Refinery Lt 2, Refinery Lt 3, Fraksinasi Lt 1, Fraksinasi Lt 2, Fraksinasi Lt 3, Storage Area, Loading Bay, Control Room, Workshop, Office Area, Laboratory.

Note on parent groups: Refinery Lt 1/2/3 belong to the "Refinery" parent area, and Fraksinasi Lt 1/2/3 belong to the "Fractionation" parent area. Daily Checklist items below are organised by these parents — each floor inherits its parent's items.

## Guiding Questions (Audit 5R) — 27 items across 5 categories

**Source:** Guidelines Sustainable 5R v.2 (Dec 2025). This is the official taxonomy for classifying audit findings — not for Daily Checklist.

**Behavior in the UI:** when the auditor logs a finding, they pick the category (level 1) → then pick the sub-category (level 2). The sub-category's description appears as helper text to guide judgement.

**Seed data structure** (use this exact structure in `prisma/seed.ts`):

```
RINGKAS — "Hanya barang yang diperlukan saja dan dalam jumlah tidak berlebihan"
  1. Material dan atau Suku cadang
     "Di area kerja tidak terdapat material yang tidak diperlukan untuk proses saat ini."
  2. Mesin dan atau Peralatan Kerja
     "Di area kerja ini tidak terdapat mesin / peralatan / tooling yang tidak sedang digunakan dan tanpa adanya tag merah."
  3. Alat Bantu, Cetakan, dan Jig
     "Di area kerja ini tidak terdapat jig, alat bantu, cetakan, atau item sejenisnya yang tidak digunakan."
  4. Arsip
     "Di area kerja ini tidak terdapat dokumen (semua informasi tertulis/tercetak baik yang berhubungan dengan kerja maupun tidak) yang sudah tidak terpakai / habis masa berlaku."
  5. Jumlah barang dengan Tag Merah
     "Barang-barang dengan tag merah yang belum dipindahkan ke Red Tag Area."

RAPI — "Setiap barang jelas tempat dan statusnya"
  1. Indikator Lokasi, Penyediaan Wadah
     "Area penyimpanan, area kerja, dan lainnya telah diberi tanda lokasi dan alamat. Semua barang ada tempatnya."
  2. Indikator Item
     "Wadah; rak, pallet, basket, dll memiliki tanda yang menunjukkan item apa harus berada di mana."
  3. Indikator Jumlah
     "Dalam wadah tercantum indikasi untuk jumlah maksimum dan minimum yang diperbolehkan."
  4. Garis Demarkasi
     "Terdapat garis / warna maupun penanda lain yang digunakan untuk mematuhi SOP serta tidak ada barang yang diletakkan di luar batas garis."
  5. Shadow Board / Rak / Wadah
     "Penataan telah diatur untuk memfasilitasi kemudahan pengambilan, pengembalian, monitoring, FIFO."

RESIK — "Area kerja bebas dari sumber kontaminasi"
  1. Lantai
     "Kebersihan lantai dijaga, berkilau, bebas dari ceceran sampah, material, oli, dan air."
  2. Mesin dan atau Peralatan Kerja
     "Mesin bebas dari serbuk / gram, sisa material, dan oli."
  3. Membersihkan = Memeriksa
     "Terdapat sistem pembersihan dan pelaporan abnormalitas; jadwal piket, sarana kebersihan, tempat sampah."
  4. Area Kritis / Sumber Kotor
     "Pada sumber pengotor sudah terlihat tindakan pembersihan."
  5. Kebiasaan Membersihkan
     "Pekerja tanpa diperintah terbiasa membersihkan lantai dan mengelap mesin."

RAWAT — "Mempertahankan area kerja Ringkas-Rapi-Resik" (7 items)
  1. SOP
     "Di area kerja tercantum SOP 5R (alur proses) maupun Standar Kerja terkini."
  2. Standard
     "Terdapat standard area di setiap tempat kerja."
  3. CheckList Standard
     "Terdapat checklist standard area."
  4. Improvement R1
     "Terdapat tindak lanjut temuan audit sebelumnya, realisasi Improvement R1, maupun rencana improvement."
  5. Improvement R2
     "Terdapat tindak lanjut temuan audit sebelumnya, realisasi Improvement R2, maupun rencana improvement."
  6. Improvement R3
     "Terdapat tindak lanjut temuan audit sebelumnya, realisasi Improvement R3, maupun rencana improvement."
  7. Audit 5R periode sebelumnya
     "Tidak terdapat temuan audit dari periode sebelumnya yang belum di-close."

RAJIN — "Setiap karyawan berdisiplin dan taat pada standard"
  1. Ketaatan pada Standar
     "Semua standar kerja (IK, Looking Standard, SOP 5R, dll) diikuti oleh karyawan."
  2. Promosi 5R
     "Terdapat pesan / slogan terkait budaya 5R."
  3. Prosedur
     "Prosedur-prosedur kerja (IK, Looking Standard, Memo Kerja, Resep, Process Card, Diagram Alir) dalam kondisi terkini dan ditinjau secara tetap."
  4. Papan Aktivitas 5R
     "Papan aktivitas 5R dalam kondisi terkini dan secara tetap ditinjau."
  5. Pelatihan
     "Setiap karyawan telah mendapatkan pelatihan prosedur kerja yang tepat."
```

**Total: 27 sub-categories (5+5+5+7+5).** Do not invent new categories. Do not collapse them. The taxonomy IS the standard.

## Daily Checklist items — area-specific

**Source:** existing AppSheet implementation (`Application_Documentation.pdf`). These are the actual items currently in use by PIC Areas. Use them verbatim in the seed.

**Behavior:** items are scoped to **parent area groups** (Refinery / Fractionation). Each floor under that parent inherits the same item set. (E.g. Refinery Lt 1, Refinery Lt 2, Refinery Lt 3 all share the Refinery item set.)

**Seed data — Refinery group (14 items):**

```
1.  Apakah drip pan pompa pompa Refinery dalam kondisi bersih
2.  Apakah drip pan dan area D304 dan D300 dalam kondisi bersih
3.  Apakah area control room Refinery bersih, tidak berminyak, dan berdebu
4.  Apakah area HPB dan compressor tidak ada ceceran minyak
5.  Apakah area sampling point bersih
6.  Apakah Strainer in plant dalam kondisi bersih
7.  Apakah Counter Bag filter sesuai actual stock
8.  Apakah ada ceceran minyak dan tumpahan SBE di area SBE
9.  Apakah ada tumpahan BE dan PA di area unloading
10. Apakah ada pressure indicator yang abnormal
11. Apakah ada barang yang tidak pada tempatnya (sarung tangan, majun, dll)
12. Apakah ada barang yang tidak pada tempatnya (sepatu, sarung tangan, helm)
13. Apakah area wastafel lantai 1 bersih, tidak becek, dan sabun terisi
14. Apakah area wastafel lantai 2 tidak becek dan terisi sabun
```

**Seed data — Fractionation group (10 items):**

```
1.  Apakah drip pan pompa dan HE fractionation dalam kondisi bersih
2.  Apakah drip pan pompa di filling room B dalam kondisi bersih
3.  Apakah drip pan pompa di filling room C dalam kondisi bersih
4.  Apakah ada ceceran minyak di lantai area coldroom dan filling room
5.  Apakah ada ceceran minyak di lantai area ruang filter press
6.  Apakah ada tumpahan / genangan di area pencucian filter leaf
7.  Apakah area sparepart terkunci dan dalam keadaan rapi
8.  Apakah jendela belakang filter press room di lantai 3 tertutup
9.  Apakah kotak APD di lantai 1 untuk masuk area H-2 terisi cukup
10. Apakah kotak APD di lantai 2 untuk masuk area H-2 terisi cukup
```

**Other areas (Storage Area, Loading Bay, Control Room, Workshop, Office Area, Laboratory):** items are not yet defined in AppSheet. For the shadow build, leave them empty in seed and add a note in `docs/decisions.md` that these areas need item definitions from the committee before they can be activated. Do not invent items for them.

**Daily Checklist scoring:** simple percentage of items marked compliant. Threshold for notification: < 90%.

## Brand / design

- Primary color (Sinar Mas red): `#C8102E`
- Dark variant: `#A00D24`
- Secondary blue: `#1976D2`
- Success: `#2E7D32`, Warning: `#ED6C02`, Danger: `#D32F2F`
- Font: Inter (load from Google Fonts)
- Mobile-first; bottom nav on mobile (<768px), sidebar on desktop
- Touch targets minimum 44×44px
- Tabular numerals for all scores and counts
- Cards with subtle shadow, 8px border radius

These are defined as CSS variables in `app/globals.css` — use them, don't hard-code.

## File & folder conventions

```
app/                  # Next.js App Router pages
  (auth)/login/       # public routes grouped
  (app)/              # authenticated routes
    audit/
    capa/
    checklist/
    redtag/
    scores/
    documents/
    schedule/
    admin/
  api/                # route handlers
components/
  ui/                 # shadcn/ui primitives (don't edit unless extending)
  shared/             # reusable app-specific components (KpiCard, ScoreCard, etc.)
  forms/              # form components
lib/
  scoring.ts          # THE scoring engine. Pure function. Has tests.
  db.ts               # Prisma client singleton
  auth.ts             # mock auth helpers
  rbac.ts             # role check helpers
  utils.ts            # cn(), date formatters, etc.
prisma/
  schema.prisma
  seed.ts             # realistic Indonesian dummy data
types/                # shared TS types not generated by Prisma
```

## Coding conventions

- **TypeScript strict mode is on.** No `any` without an inline comment justifying it.
- **Server Components by default.** Add `"use client"` only when actually needed (event handlers, state, browser APIs).
- **Prefer `async` Server Components + direct Prisma calls** over API routes, unless mutation needs to be called from client.
- **Mutations use Server Actions** (`"use server"`), not API routes, unless there's a reason.
- **Zod validation on every form.** Define schema in `lib/schemas/` and share between client and server.
- **Never call Prisma from client components.** Pass data down as props.
- **One responsibility per component.** If a component file exceeds ~150 lines, split it.
- **Imports order:** React → Next → third-party → `@/lib` → `@/components` → relative.

## Things to AVOID

- Inline scoring math. The formula lives in ONE place.
- Hard-coded role checks like `if (user.role === "admin")`. Use `lib/rbac.ts` helpers.
- Inline color values like `bg-[#C8102E]`. Use Tailwind theme tokens.
- `useState` for data that the URL could hold (filters, tabs). Use `searchParams`.
- Mock data scattered across files. Seed data lives in `prisma/seed.ts`.
- Long form components without React Hook Form. Even small forms benefit from it.
- Creating files speculatively. Build what's needed for the current module.

## Testing

For this shadow build, the bar is intentionally pragmatic:
- **Must have unit tests:** `lib/scoring.ts` (the scoring formula — including the 21-finding example above).
- **Must have unit tests:** `lib/rbac.ts` (role checks).
- **Should have:** integration tests for happy-path audit → CAPA → score flow.
- **Nice to have:** Playwright E2E for the demo flow.

Use Vitest. Run with `npm test`.

## When you need to make a decision I haven't covered

1. Re-read this file first.
2. Check `docs/decisions.md` if it exists.
3. Pick the option that's: (a) simpler, (b) more aligned with existing patterns in the codebase, (c) easier to throw away if wrong.
4. Add an entry to `docs/decisions.md` explaining what you chose and why.

## Definition of "done" per feature

Before considering a feature complete, verify:
- [ ] Works on mobile (resize browser to ~375px wide and test).
- [ ] Works on desktop.
- [ ] Loading state implemented.
- [ ] Empty state implemented.
- [ ] Form validation with inline errors (if applicable).
- [ ] Role-based access enforced (if applicable).
- [ ] Bahasa Indonesia UI text.
- [ ] No console errors.
- [ ] No TypeScript errors (`npm run typecheck`).
- [ ] Seed data updated if new entities introduced.

## Process — how I want you to work with me

- **Before writing code for a new feature:** outline the plan in 3-5 bullets, then wait for me to say "go".
- **For changes that touch business rules** (scoring, validation, RBAC, the rules in this file): pause and confirm.
- **After changes:** summarise what you did in 2-3 bullets, not a paragraph.
- **When unsure:** ask one focused question rather than guessing.
- **Don't restate this file back to me.** I wrote it / read it. Just follow it.
