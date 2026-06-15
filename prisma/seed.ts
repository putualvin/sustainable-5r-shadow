import { PrismaClient, type AreaGroup, type Role } from "@prisma/client";
import { calculate5RScore } from "../lib/scoring";

const db = new PrismaClient();

// Seeded finding tallies per area (current period). finalScore is derived via
// lib/scoring.ts — never hand-computed. Chosen to spread scores ~60–95%.
const SCORE_TALLIES: {
  code: string;
  done: number;
  progress: number;
  noProgress: number;
}[] = [
  { code: "REF-1", done: 17, progress: 3, noProgress: 1 },
  { code: "REF-2", done: 20, progress: 2, noProgress: 0 },
  { code: "REF-3", done: 12, progress: 5, noProgress: 4 },
  { code: "FRA-1", done: 15, progress: 4, noProgress: 2 },
  { code: "FRA-2", done: 18, progress: 2, noProgress: 1 },
  { code: "FRA-3", done: 10, progress: 6, noProgress: 3 },
  { code: "STG", done: 19, progress: 2, noProgress: 1 },
  { code: "LDB", done: 14, progress: 5, noProgress: 3 },
  { code: "CTR", done: 16, progress: 3, noProgress: 2 },
  { code: "WSH", done: 13, progress: 4, noProgress: 3 },
  { code: "OFF", done: 19, progress: 3, noProgress: 0 },
  { code: "LAB", done: 17, progress: 4, noProgress: 1 },
];

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// 12 areas of pilot unit "Refinery 2".
const AREAS: { code: string; name: string; group: AreaGroup | null }[] = [
  { code: "REF-1", name: "Refinery Lt 1", group: "REFINERY" },
  { code: "REF-2", name: "Refinery Lt 2", group: "REFINERY" },
  { code: "REF-3", name: "Refinery Lt 3", group: "REFINERY" },
  { code: "FRA-1", name: "Fraksinasi Lt 1", group: "FRACTIONATION" },
  { code: "FRA-2", name: "Fraksinasi Lt 2", group: "FRACTIONATION" },
  { code: "FRA-3", name: "Fraksinasi Lt 3", group: "FRACTIONATION" },
  { code: "STG", name: "Storage Area", group: null },
  { code: "LDB", name: "Loading Bay", group: null },
  { code: "CTR", name: "Control Room", group: null },
  { code: "WSH", name: "Workshop", group: null },
  { code: "OFF", name: "Office Area", group: null },
  { code: "LAB", name: "Laboratory", group: null },
];

async function main() {
  console.log("Seeding areas + users...");

  // Areas
  for (const a of AREAS) {
    await db.area.upsert({
      where: { code: a.code },
      update: { name: a.name, group: a.group },
      create: a,
    });
  }

  const refinery2 = await db.area.findUnique({ where: { code: "REF-2" } });

  // 7 mock users covering all 6 roles (emails chosen so prefix→role mapping works).
  const users: {
    email: string;
    name: string;
    role: Role;
    areaCode?: string;
  }[] = [
    { email: "admin@5r.local", name: "Admin Sistem", role: "admin" },
    { email: "komite@5r.local", name: "Halim (Komite Unit)", role: "komite_unit" },
    { email: "auditor1@5r.local", name: "Muhib (Auditor)", role: "auditor" },
    { email: "auditor2@5r.local", name: "Auditor Kedua", role: "auditor" },
    {
      email: "pic.refinery2@5r.local",
      name: "PIC Refinery Lt 2",
      role: "auditee",
      areaCode: "REF-2",
    },
    { email: "redtag@5r.local", name: "Koordinator Red Tag", role: "kord_red_tag" },
    { email: "gm@5r.local", name: "Management", role: "management" },
  ];

  for (const u of users) {
    const areaId =
      u.areaCode === "REF-2" ? refinery2?.id ?? null : null;
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, areaId },
      create: { email: u.email, name: u.name, role: u.role, areaId },
    });
  }

  // Scores for the current period
  const period = currentPeriod();
  for (const t of SCORE_TALLIES) {
    const area = await db.area.findUnique({ where: { code: t.code } });
    if (!area) continue;
    const { finalScore } = calculate5RScore({
      done: t.done,
      progress: t.progress,
      noProgress: t.noProgress,
    });
    await db.score.upsert({
      where: { areaId_period: { areaId: area.id, period } },
      update: {
        countDone: t.done,
        countProgress: t.progress,
        countNoProgress: t.noProgress,
        finalScore,
      },
      create: {
        areaId: area.id,
        period,
        countDone: t.done,
        countProgress: t.progress,
        countNoProgress: t.noProgress,
        finalScore,
      },
    });
  }

  const [areaCount, userCount, scoreCount] = await Promise.all([
    db.area.count(),
    db.user.count(),
    db.score.count(),
  ]);
  console.log(
    `Done. Areas: ${areaCount}, Users: ${userCount}, Scores: ${scoreCount} (period ${period})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
