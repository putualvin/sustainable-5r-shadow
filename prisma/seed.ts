import {
  PrismaClient,
  type AreaGroup,
  type DocCategory,
  type Pillar,
  type Role,
} from "@prisma/client";
import { calculate5RScore } from "../lib/scoring";
import { RETENTION_DAYS } from "../lib/redtag";

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

// Daily Checklist items per parent group (from AppSheet documentation, verbatim).
const CHECKLIST_ITEMS: { group: AreaGroup; text: string }[] = [
  // Refinery (14)
  { group: "REFINERY", text: "Apakah drip pan pompa pompa Refinery dalam kondisi bersih" },
  { group: "REFINERY", text: "Apakah drip pan dan area D304 dan D300 dalam kondisi bersih" },
  { group: "REFINERY", text: "Apakah area control room Refinery bersih, tidak berminyak, dan berdebu" },
  { group: "REFINERY", text: "Apakah area HPB dan compressor tidak ada ceceran minyak" },
  { group: "REFINERY", text: "Apakah area sampling point bersih" },
  { group: "REFINERY", text: "Apakah Strainer in plant dalam kondisi bersih" },
  { group: "REFINERY", text: "Apakah Counter Bag filter sesuai actual stock" },
  { group: "REFINERY", text: "Apakah ada ceceran minyak dan tumpahan SBE di area SBE" },
  { group: "REFINERY", text: "Apakah ada tumpahan BE dan PA di area unloading" },
  { group: "REFINERY", text: "Apakah ada pressure indicator yang abnormal" },
  { group: "REFINERY", text: "Apakah ada barang yang tidak pada tempatnya (sarung tangan, majun, dll)" },
  { group: "REFINERY", text: "Apakah ada barang yang tidak pada tempatnya (sepatu, sarung tangan, helm)" },
  { group: "REFINERY", text: "Apakah area wastafel lantai 1 bersih, tidak becek, dan sabun terisi" },
  { group: "REFINERY", text: "Apakah area wastafel lantai 2 tidak becek dan terisi sabun" },
  // Fractionation (10)
  { group: "FRACTIONATION", text: "Apakah drip pan pompa dan HE fractionation dalam kondisi bersih" },
  { group: "FRACTIONATION", text: "Apakah drip pan pompa di filling room B dalam kondisi bersih" },
  { group: "FRACTIONATION", text: "Apakah drip pan pompa di filling room C dalam kondisi bersih" },
  { group: "FRACTIONATION", text: "Apakah ada ceceran minyak di lantai area coldroom dan filling room" },
  { group: "FRACTIONATION", text: "Apakah ada ceceran minyak di lantai area ruang filter press" },
  { group: "FRACTIONATION", text: "Apakah ada tumpahan / genangan di area pencucian filter leaf" },
  { group: "FRACTIONATION", text: "Apakah area sparepart terkunci dan dalam keadaan rapi" },
  { group: "FRACTIONATION", text: "Apakah jendela belakang filter press room di lantai 3 tertutup" },
  { group: "FRACTIONATION", text: "Apakah kotak APD di lantai 1 untuk masuk area H-2 terisi cukup" },
  { group: "FRACTIONATION", text: "Apakah kotak APD di lantai 2 untuk masuk area H-2 terisi cukup" },
];

// Reference documents for the repository (Module 7). fileUrl left null —
// registered references whose files/links are attached via the UI.
const DOCUMENTS: {
  title: string;
  category: DocCategory;
  version: string;
  description: string;
}[] = [
  { title: "Guidelines Sustainable 5R v.2", category: "PANDUAN", version: "v2.0", description: "Panduan resmi 5R beserta 27 guiding questions (Des 2025)." },
  { title: "SOP Pelaksanaan Audit 5R", category: "SOP", version: "v1.2", description: "Tata cara audit bulanan lintas area oleh auditor." },
  { title: "SOP Pengelolaan Red Tag", category: "SOP", version: "v1.0", description: "Alur registrasi hingga keputusan disposal barang red tag." },
  { title: "Standar Area Refinery", category: "STANDARD", version: "v1.1", description: "Standar kondisi 5R untuk area Refinery Lt 1–3." },
  { title: "Template Temuan & CAPA", category: "TEMPLATE", version: "v1.0", description: "Format isian temuan audit dan rencana CAPA." },
  { title: "Formulir Checklist Harian", category: "FORMULIR", version: "v1.0", description: "Cetakan checklist harian per shift untuk PIC area." },
];

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// "YYYY-MM" for the month `n` months before now (for seeded score history).
function periodMonthsAgo(n: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  // A PIC (auditee) account per area so every audited area has a receiver for
  // its findings (audit -> CAPA loop works for all 12 areas, not just REF-2).
  // Email convention: pic.<area-code>@5r.local (prefix "pic" -> auditee role).
  const allAreasForPic = await db.area.findMany({ orderBy: { code: "asc" } });
  for (const area of allAreasForPic) {
    const email = `pic.${area.code.toLowerCase()}@5r.local`;
    await db.user.upsert({
      where: { email },
      update: { name: `PIC ${area.name}`, role: "auditee", areaId: area.id },
      create: { email, name: `PIC ${area.name}`, role: "auditee", areaId: area.id },
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

  // Score history for the 2 previous periods so the monthly report trend and
  // "vs last month" deltas are meaningful. Older months trend slightly lower
  // (some Done shifted to Progress/No Progress) → a gentle upward trend.
  for (const offset of [2, 1]) {
    const histPeriod = periodMonthsAgo(offset);
    for (const t of SCORE_TALLIES) {
      const area = await db.area.findUnique({ where: { code: t.code } });
      if (!area) continue;
      const done = Math.max(0, t.done - offset * 2);
      const progress = t.progress + offset;
      const noProgress = t.noProgress + offset;
      const { finalScore } = calculate5RScore({ done, progress, noProgress });
      await db.score.upsert({
        where: { areaId_period: { areaId: area.id, period: histPeriod } },
        update: { countDone: done, countProgress: progress, countNoProgress: noProgress, finalScore },
        create: {
          areaId: area.id,
          period: histPeriod,
          countDone: done,
          countProgress: progress,
          countNoProgress: noProgress,
          finalScore,
        },
      });
    }
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

  // Daily Checklist items (24) — seed once.
  if ((await db.checklistItem.count()) === 0) {
    let order = 0;
    for (const item of CHECKLIST_ITEMS) {
      await db.checklistItem.create({ data: { ...item, order: order++ } });
    }
  }

  // Sample Red Tags for REF-2 (varied urgency) — seed once.
  if (ref2 && (await db.redTag.count()) === 0) {
    const day = 1000 * 60 * 60 * 24;
    const now = Date.now();
    const year = new Date().getFullYear();
    const seeds = [
      // approaching: registered 27 days ago, IN_AREA (30d) -> due in ~3 days
      { name: "Motor pompa cadangan rusak", category: "Suku Cadang", reason: "Rusak, tidak dapat diperbaiki", location: "IN_AREA" as const, regAgo: 27, status: "OPEN" as const },
      // overdue: registered 95 days ago, RT_AREA (90d) -> overdue ~5 days
      { name: "Drum bekas pelarut", category: "Material", reason: "Tidak terpakai di proses saat ini", location: "RT_AREA" as const, regAgo: 95, status: "OPEN" as const },
      // decided
      { name: "Panel kontrol lama", category: "Peralatan / Tooling", reason: "Sudah diganti unit baru", location: "RT_AREA" as const, regAgo: 40, status: "DISPOSED" as const },
    ];
    let seq = 1;
    for (const s of seeds) {
      const registeredAt = new Date(now - s.regAgo * day);
      const dueDate = new Date(registeredAt.getTime() + RETENTION_DAYS[s.location] * day);
      await db.redTag.create({
        data: {
          tagNumber: `RT-${year}-${String(seq++).padStart(3, "0")}`,
          areaId: ref2.id,
          name: s.name,
          category: s.category,
          reason: s.reason,
          location: s.location,
          status: s.status,
          registeredAt,
          dueDate,
          decidedAt: s.status === "OPEN" ? null : new Date(now - 10 * day),
        },
      });
    }
  }

  // Reference documents (Module 7) — seed once.
  if ((await db.document.count()) === 0) {
    for (const d of DOCUMENTS) {
      await db.document.create({ data: { ...d, uploadedBy: "Komite Unit" } });
    }
  }

  // Seed a few audit-log entries so the log isn't empty on first load.
  if ((await db.auditLog.count()) === 0) {
    await db.auditLog.createMany({
      data: [
        { action: "system.seed", entity: "System", summary: "Inisialisasi data master & seed.", userName: "Sistem", userEmail: "-" },
        { action: "schedule.generate", entity: "AuditSchedule", summary: `Membuat jadwal audit periode ${period} untuk 12 area.`, userName: "Halim (Komite Unit)", userEmail: "komite@5r.local" },
        { action: "audit.submit", entity: "Audit", summary: "Audit Refinery Lt 2 dikirim dengan 5 temuan.", userName: "Muhib (Auditor)", userEmail: "auditor1@5r.local" },
      ],
    });
  }

  const [areaCount, userCount, scoreCount, gqCount, schedCount, itemCount, docCount] =
    await Promise.all([
      db.area.count(),
      db.user.count(),
      db.score.count(),
      db.guidingQuestion.count(),
      db.auditSchedule.count(),
      db.checklistItem.count(),
      db.document.count(),
    ]);
  console.log(
    `Done. Areas: ${areaCount}, Users: ${userCount}, Scores: ${scoreCount}, ` +
      `GuidingQuestions: ${gqCount}, Schedules: ${schedCount}, ` +
      `ChecklistItems: ${itemCount}, Documents: ${docCount} (period ${period})`
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
