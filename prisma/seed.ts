import {
  PrismaClient,
  type AreaGroup,
  type Pillar,
  type Role,
} from "@prisma/client";
import { calculate5RScore } from "../lib/scoring";

const db = new PrismaClient();

// Official 5R taxonomy — 27 sub-categories (Guidelines Sustainable 5R v.2).
const GUIDING_QUESTIONS: {
  pillar: Pillar;
  subCategory: string;
  description: string;
}[] = [
  // RINGKAS (5)
  { pillar: "RINGKAS", subCategory: "Material dan atau Suku cadang", description: "Di area kerja tidak terdapat material yang tidak diperlukan untuk proses saat ini." },
  { pillar: "RINGKAS", subCategory: "Mesin dan atau Peralatan Kerja", description: "Di area kerja ini tidak terdapat mesin / peralatan / tooling yang tidak sedang digunakan dan tanpa adanya tag merah." },
  { pillar: "RINGKAS", subCategory: "Alat Bantu, Cetakan, dan Jig", description: "Di area kerja ini tidak terdapat jig, alat bantu, cetakan, atau item sejenisnya yang tidak digunakan." },
  { pillar: "RINGKAS", subCategory: "Arsip", description: "Di area kerja ini tidak terdapat dokumen (semua informasi tertulis/tercetak baik yang berhubungan dengan kerja maupun tidak) yang sudah tidak terpakai / habis masa berlaku." },
  { pillar: "RINGKAS", subCategory: "Jumlah barang dengan Tag Merah", description: "Barang-barang dengan tag merah yang belum dipindahkan ke Red Tag Area." },
  // RAPI (5)
  { pillar: "RAPI", subCategory: "Indikator Lokasi, Penyediaan Wadah", description: "Area penyimpanan, area kerja, dan lainnya telah diberi tanda lokasi dan alamat. Semua barang ada tempatnya." },
  { pillar: "RAPI", subCategory: "Indikator Item", description: "Wadah; rak, pallet, basket, dll memiliki tanda yang menunjukkan item apa harus berada di mana." },
  { pillar: "RAPI", subCategory: "Indikator Jumlah", description: "Dalam wadah tercantum indikasi untuk jumlah maksimum dan minimum yang diperbolehkan." },
  { pillar: "RAPI", subCategory: "Garis Demarkasi", description: "Terdapat garis / warna maupun penanda lain yang digunakan untuk mematuhi SOP serta tidak ada barang yang diletakkan di luar batas garis." },
  { pillar: "RAPI", subCategory: "Shadow Board / Rak / Wadah", description: "Penataan telah diatur untuk memfasilitasi kemudahan pengambilan, pengembalian, monitoring, FIFO." },
  // RESIK (5)
  { pillar: "RESIK", subCategory: "Lantai", description: "Kebersihan lantai dijaga, berkilau, bebas dari ceceran sampah, material, oli, dan air." },
  { pillar: "RESIK", subCategory: "Mesin dan atau Peralatan Kerja", description: "Mesin bebas dari serbuk / gram, sisa material, dan oli." },
  { pillar: "RESIK", subCategory: "Membersihkan = Memeriksa", description: "Terdapat sistem pembersihan dan pelaporan abnormalitas; jadwal piket, sarana kebersihan, tempat sampah." },
  { pillar: "RESIK", subCategory: "Area Kritis / Sumber Kotor", description: "Pada sumber pengotor sudah terlihat tindakan pembersihan." },
  { pillar: "RESIK", subCategory: "Kebiasaan Membersihkan", description: "Pekerja tanpa diperintah terbiasa membersihkan lantai dan mengelap mesin." },
  // RAWAT (7)
  { pillar: "RAWAT", subCategory: "SOP", description: "Di area kerja tercantum SOP 5R (alur proses) maupun Standar Kerja terkini." },
  { pillar: "RAWAT", subCategory: "Standard", description: "Terdapat standard area di setiap tempat kerja." },
  { pillar: "RAWAT", subCategory: "CheckList Standard", description: "Terdapat checklist standard area." },
  { pillar: "RAWAT", subCategory: "Improvement R1", description: "Terdapat tindak lanjut temuan audit sebelumnya, realisasi Improvement R1, maupun rencana improvement." },
  { pillar: "RAWAT", subCategory: "Improvement R2", description: "Terdapat tindak lanjut temuan audit sebelumnya, realisasi Improvement R2, maupun rencana improvement." },
  { pillar: "RAWAT", subCategory: "Improvement R3", description: "Terdapat tindak lanjut temuan audit sebelumnya, realisasi Improvement R3, maupun rencana improvement." },
  { pillar: "RAWAT", subCategory: "Audit 5R periode sebelumnya", description: "Tidak terdapat temuan audit dari periode sebelumnya yang belum di-close." },
  // RAJIN (5)
  { pillar: "RAJIN", subCategory: "Ketaatan pada Standar", description: "Semua standar kerja (IK, Looking Standard, SOP 5R, dll) diikuti oleh karyawan." },
  { pillar: "RAJIN", subCategory: "Promosi 5R", description: "Terdapat pesan / slogan terkait budaya 5R." },
  { pillar: "RAJIN", subCategory: "Prosedur", description: "Prosedur-prosedur kerja (IK, Looking Standard, Memo Kerja, Resep, Process Card, Diagram Alir) dalam kondisi terkini dan ditinjau secara tetap." },
  { pillar: "RAJIN", subCategory: "Papan Aktivitas 5R", description: "Papan aktivitas 5R dalam kondisi terkini dan secara tetap ditinjau." },
  { pillar: "RAJIN", subCategory: "Pelatihan", description: "Setiap karyawan telah mendapatkan pelatihan prosedur kerja yang tepat." },
];

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

  // Guiding Questions (27) — seed once.
  if ((await db.guidingQuestion.count()) === 0) {
    let order = 0;
    for (const gq of GUIDING_QUESTIONS) {
      await db.guidingQuestion.create({ data: { ...gq, order: order++ } });
    }
  }

  // Audit schedules for current period: alternate auditors across areas.
  const auditor1 = await db.user.findUnique({ where: { email: "auditor1@5r.local" } });
  const auditor2 = await db.user.findUnique({ where: { email: "auditor2@5r.local" } });
  if (auditor1 && auditor2) {
    const allAreas = await db.area.findMany({ orderBy: { code: "asc" } });
    for (let i = 0; i < allAreas.length; i++) {
      const auditorId = i % 2 === 0 ? auditor1.id : auditor2.id;
      await db.auditSchedule.upsert({
        where: { areaId_period: { areaId: allAreas[i].id, period } },
        update: { auditorId },
        create: { areaId: allAreas[i].id, auditorId, period },
      });
    }
  }

  // A submitted audit for REF-2 with findings awaiting CAPA — gives the PIC
  // (pic.refinery2) an inbox and lets the audit->CAPA->score loop be demoed.
  const ref2 = await db.area.findUnique({ where: { code: "REF-2" } });
  if (ref2 && auditor1 && (await db.audit.count({ where: { areaId: ref2.id, period } })) === 0) {
    const gqs = await db.guidingQuestion.findMany({ orderBy: { order: "asc" } });
    const pick = (sub: string) => gqs.find((g) => g.subCategory === sub)!;
    const audit = await db.audit.create({
      data: {
        areaId: ref2.id,
        auditorId: auditor1.id,
        period,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });
    const findingSeeds = [
      { gq: pick("Lantai"), location: "Dekat pompa P-101", description: "Ceceran oli di lantai area pompa." },
      { gq: pick("Garis Demarkasi"), location: "Area drum", description: "Drum diletakkan di luar garis demarkasi." },
      { gq: pick("Material dan atau Suku cadang"), location: "Rak B2", description: "Material tidak terpakai menumpuk di rak." },
      { gq: pick("SOP"), location: "Panel kontrol", description: "SOP 5R tidak terpasang/usang." },
      { gq: pick("Promosi 5R"), location: "Dinding lorong", description: "Tidak ada slogan/visual budaya 5R." },
    ];
    for (const f of findingSeeds) {
      await db.finding.create({
        data: {
          auditId: audit.id,
          guidingQuestionId: f.gq.id,
          locationDetail: f.location,
          description: f.description,
          status: "PENDING_CAPA",
        },
      });
    }
  }

  const [areaCount, userCount, scoreCount, gqCount, schedCount] =
    await Promise.all([
      db.area.count(),
      db.user.count(),
      db.score.count(),
      db.guidingQuestion.count(),
      db.auditSchedule.count(),
    ]);
  console.log(
    `Done. Areas: ${areaCount}, Users: ${userCount}, Scores: ${scoreCount}, ` +
      `GuidingQuestions: ${gqCount}, Schedules: ${schedCount} (period ${period})`
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
