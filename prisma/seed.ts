import {
  PrismaClient,
  type AreaGroup,
  type DocCategory,
  type Pillar,
  type Role,
} from "@prisma/client";
import { calculateFinalScore } from "../lib/scoring";
import { RETENTION_DAYS } from "../lib/redtag";

const db = new PrismaClient();

// Generic 5R taxonomy for the public demo. The labels are intentionally
// organization-neutral and must not be treated as an approved company standard.
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
  recurring: number; // temuan berulang (§5.4) — pengurang Score Akhir
}[] = [
  { code: "REF-1", done: 17, progress: 3, noProgress: 1, recurring: 1 },
  { code: "REF-2", done: 20, progress: 2, noProgress: 0, recurring: 1 },
  { code: "REF-3", done: 12, progress: 5, noProgress: 4, recurring: 3 },
  { code: "FRA-1", done: 15, progress: 4, noProgress: 2, recurring: 2 },
  { code: "FRA-2", done: 18, progress: 2, noProgress: 1, recurring: 1 },
  { code: "FRA-3", done: 10, progress: 6, noProgress: 3, recurring: 2 },
  { code: "STG", done: 19, progress: 2, noProgress: 1, recurring: 0 },
  { code: "LDB", done: 14, progress: 5, noProgress: 3, recurring: 2 },
  { code: "CTR", done: 16, progress: 3, noProgress: 2, recurring: 1 },
  { code: "WSH", done: 13, progress: 4, noProgress: 3, recurring: 2 },
  { code: "OFF", done: 19, progress: 3, noProgress: 0, recurring: 0 },
  { code: "LAB", done: 17, progress: 4, noProgress: 1, recurring: 1 },
];

// Synthetic checklist items for the public demo. They demonstrate the two
// checklist groups without exposing plant-specific locations or equipment.
const CHECKLIST_ITEMS: { group: AreaGroup; text: string }[] = [
  // Zone A (14)
  { group: "REFINERY", text: "Apakah lantai area kerja bersih dan kering" },
  { group: "REFINERY", text: "Apakah pelindung tetesan pada peralatan dalam kondisi bersih" },
  { group: "REFINERY", text: "Apakah panel dan indikator peralatan terlihat normal" },
  { group: "REFINERY", text: "Apakah jalur pejalan kaki bebas dari hambatan" },
  { group: "REFINERY", text: "Apakah titik pemeriksaan mudah diakses dan bersih" },
  { group: "REFINERY", text: "Apakah alat kerja dikembalikan ke lokasi berlabel" },
  { group: "REFINERY", text: "Apakah jumlah bahan habis pakai sesuai batas minimum dan maksimum" },
  { group: "REFINERY", text: "Apakah tempat sampah tersedia dan tidak meluap" },
  { group: "REFINERY", text: "Apakah area penerimaan barang bebas dari material tercecer" },
  { group: "REFINERY", text: "Apakah tidak ada tanda kerusakan atau kondisi abnormal" },
  { group: "REFINERY", text: "Apakah perlengkapan kerja tersimpan pada tempatnya" },
  { group: "REFINERY", text: "Apakah alat pelindung diri tersimpan rapi dan lengkap" },
  { group: "REFINERY", text: "Apakah fasilitas cuci tangan bersih dan tersedia sabun" },
  { group: "REFINERY", text: "Apakah papan informasi area dalam kondisi terbaru" },
  // Zone B (10)
  { group: "FRACTIONATION", text: "Apakah lantai dan permukaan kerja bersih dari tumpahan" },
  { group: "FRACTIONATION", text: "Apakah alat bantu kerja tersusun sesuai label" },
  { group: "FRACTIONATION", text: "Apakah wadah material tertutup dan beridentitas" },
  { group: "FRACTIONATION", text: "Apakah jalur evakuasi bebas dari hambatan" },
  { group: "FRACTIONATION", text: "Apakah area penyimpanan sementara dalam kondisi rapi" },
  { group: "FRACTIONATION", text: "Apakah tidak ada genangan di area pencucian umum" },
  { group: "FRACTIONATION", text: "Apakah lemari perlengkapan terkunci dan tertata" },
  { group: "FRACTIONATION", text: "Apakah pintu dan jendela area dalam kondisi aman" },
  { group: "FRACTIONATION", text: "Apakah persediaan alat pelindung diri mencukupi" },
  { group: "FRACTIONATION", text: "Apakah catatan inspeksi harian telah diperbarui" },
];

// Reference documents for the repository (Module 7). fileUrl left null —
// registered references whose files/links are attached via the UI.
const DOCUMENTS: {
  title: string;
  category: DocCategory;
  version: string;
  description: string;
}[] = [
  { title: "Panduan Demo 5R", category: "PANDUAN", version: "v1.0", description: "Contoh panduan 5R untuk demonstrasi aplikasi." },
  { title: "Contoh Prosedur Audit 5R", category: "SOP", version: "v1.0", description: "Contoh tata cara audit bulanan lintas area." },
  { title: "Contoh Prosedur Red Tag", category: "SOP", version: "v1.0", description: "Contoh alur registrasi dan keputusan barang red tag." },
  { title: "Contoh Standar Area", category: "STANDARD", version: "v1.0", description: "Contoh standar kondisi 5R untuk fasilitas simulasi." },
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

// Twelve synthetic areas for the public demo. Codes are stable database keys;
// displayed names are deliberately generic.
const AREAS: { code: string; name: string; group: AreaGroup | null }[] = [
  { code: "REF-1", name: "Zona A - Lantai 1", group: "REFINERY" },
  { code: "REF-2", name: "Zona A - Lantai 2", group: "REFINERY" },
  { code: "REF-3", name: "Zona A - Lantai 3", group: "REFINERY" },
  { code: "FRA-1", name: "Zona B - Lantai 1", group: "FRACTIONATION" },
  { code: "FRA-2", name: "Zona B - Lantai 2", group: "FRACTIONATION" },
  { code: "FRA-3", name: "Zona B - Lantai 3", group: "FRACTIONATION" },
  { code: "STG", name: "Gudang Simulasi", group: null },
  { code: "LDB", name: "Area Penerimaan", group: null },
  { code: "CTR", name: "Ruang Operasi", group: null },
  { code: "WSH", name: "Area Perawatan", group: null },
  { code: "OFF", name: "Area Administrasi", group: null },
  { code: "LAB", name: "Ruang Pengujian", group: null },
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

  const demoArea = await db.area.findUnique({ where: { code: "REF-2" } });

  // 7 mock users covering all 6 roles (emails chosen so prefix→role mapping works).
  const users: {
    email: string;
    name: string;
    roles: Role[];
    areaCode?: string;
  }[] = [
    { email: "admin@5r.local", name: "Admin Sistem", roles: ["admin"] },
    { email: "komite@5r.local", name: "Komite Demo", roles: ["komite_unit"] },
    { email: "auditor1@5r.local", name: "Auditor Demo 1", roles: ["auditor"] },
    { email: "auditor2@5r.local", name: "Auditor Demo 2", roles: ["auditor"] },
    {
      email: "pic.ref-2@5r.local",
      name: "PIC Zona A - Lantai 2",
      roles: ["auditee"],
      areaCode: "REF-2",
    },
    { email: "redtag@5r.local", name: "Koordinator Red Tag", roles: ["kord_red_tag"] },
    { email: "gm@5r.local", name: "Management", roles: ["management"] },
  ];

  for (const u of users) {
    const areaId =
      u.areaCode === "REF-2" ? demoArea?.id ?? null : null;
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, roles: u.roles, areaId },
      create: { email: u.email, name: u.name, roles: u.roles, areaId },
    });
  }

  // A PIC (auditee) account per area so every audited area has a receiver for
  // its findings and the audit -> CAPA loop works across the demo facility.
  // Email convention: pic.<area-code>@5r.local (prefix "pic" -> auditee role).
  // The first Zone B PIC also holds the auditor role to demonstrate multi-role (one
  // person who is both auditee for their area and an auditor elsewhere — the
  // schedule generator never assigns them to audit their own area).
  const allAreasForPic = await db.area.findMany({ orderBy: { code: "asc" } });
  for (const area of allAreasForPic) {
    const email = `pic.${area.code.toLowerCase()}@5r.local`;
    const roles: Role[] = area.code === "FRA-1" ? ["auditee", "auditor"] : ["auditee"];
    await db.user.upsert({
      where: { email },
      update: { name: `PIC ${area.name}`, roles, areaId: area.id },
      create: { email, name: `PIC ${area.name}`, roles, areaId: area.id },
    });
  }

  // Scores for the current period (two-layer §5.4 via lib/scoring.ts).
  const period = currentPeriod();
  for (const t of SCORE_TALLIES) {
    const area = await db.area.findUnique({ where: { code: t.code } });
    if (!area) continue;
    const s = calculateFinalScore({
      done: t.done,
      progress: t.progress,
      noProgress: t.noProgress,
      recurring: t.recurring,
    });
    const data = {
      countDone: t.done,
      countProgress: t.progress,
      countNoProgress: t.noProgress,
      nilaiUtama: s.nilaiUtama,
      temuanBerulang: s.temuanBerulang,
      parkingLot: s.parkingLot,
      finalScore: s.scoreAkhir,
    };
    await db.score.upsert({
      where: { areaId_period: { areaId: area.id, period } },
      update: data,
      create: { areaId: area.id, period, ...data },
    });
  }

  // Score history for the 2 previous periods so the monthly report trend and
  // "vs last month" deltas are meaningful. Older months trend slightly lower.
  for (const offset of [2, 1]) {
    const histPeriod = periodMonthsAgo(offset);
    for (const t of SCORE_TALLIES) {
      const area = await db.area.findUnique({ where: { code: t.code } });
      if (!area) continue;
      const done = Math.max(0, t.done - offset * 2);
      const progress = t.progress + offset;
      const noProgress = t.noProgress + offset;
      const s = calculateFinalScore({ done, progress, noProgress, recurring: t.recurring });
      const data = {
        countDone: done,
        countProgress: progress,
        countNoProgress: noProgress,
        nilaiUtama: s.nilaiUtama,
        temuanBerulang: s.temuanBerulang,
        parkingLot: s.parkingLot,
        finalScore: s.scoreAkhir,
      };
      await db.score.upsert({
        where: { areaId_period: { areaId: area.id, period: histPeriod } },
        update: data,
        create: { areaId: area.id, period: histPeriod, ...data },
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

  // A submitted audit for the primary demo area gives its PIC an inbox and
  // lets the audit -> CAPA -> score loop be demonstrated.
  if (demoArea && auditor1 && (await db.audit.count({ where: { areaId: demoArea.id, period } })) === 0) {
    const gqs = await db.guidingQuestion.findMany({ orderBy: { order: "asc" } });
    const pick = (sub: string) => gqs.find((g) => g.subCategory === sub)!;
    const audit = await db.audit.create({
      data: {
        areaId: demoArea.id,
        auditorId: auditor1.id,
        period,
        status: "SUBMITTED",
        // Dikirim tgl 8 (≤ tgl 10) → on-time untuk demo Skor Auditor (§5.5).
        submittedAt: new Date(`${period}-08T09:00:00`),
      },
    });
    const findingSeeds = [
      { gq: pick("Lantai"), location: "Stasiun kerja A", description: "Lantai belum dibersihkan setelah kegiatan simulasi.", kategori: "HIGH" as const, isRecurring: true },
      { gq: pick("Garis Demarkasi"), location: "Area penyimpanan A", description: "Satu wadah ditempatkan di luar garis demarkasi.", kategori: "LOW" as const, isRecurring: false },
      { gq: pick("Material dan atau Suku cadang"), location: "Rak contoh B", description: "Barang nonaktif belum dipindahkan dari rak kerja.", kategori: "LOW" as const, isRecurring: false },
      { gq: pick("SOP"), location: "Papan informasi", description: "Salinan instruksi kerja demo belum diperbarui.", kategori: "HIGH" as const, isRecurring: false },
      { gq: pick("Promosi 5R"), location: "Koridor utama", description: "Media pengingat budaya 5R belum tersedia.", kategori: "LOW" as const, isRecurring: false },
    ];
    for (const f of findingSeeds) {
      await db.finding.create({
        data: {
          auditId: audit.id,
          guidingQuestionId: f.gq.id,
          locationDetail: f.location,
          description: f.description,
          kategori: f.kategori,
          isRecurring: f.isRecurring,
          status: "PENDING_CAPA",
        },
      });
    }
  }

  // Previous-period findings for one of auditor1's CURRENT-period areas, so the
  // "Verifikasi Temuan Bulan Lalu" step (§5.4) has data to demo: when auditor1
  // starts that area's audit this period, last month's findings appear for
  // verification (Masih ada → temuan berulang / Sudah ditangani).
  const lastPeriod = periodMonthsAgo(1);
  const reviewSchedule =
    auditor1 && demoArea
      ? await db.auditSchedule.findFirst({
          where: { period, auditorId: auditor1.id, areaId: { not: demoArea.id } },
          orderBy: { area: { code: "asc" } },
        })
      : null;
  if (
    reviewSchedule &&
    auditor2 &&
    (await db.audit.count({
      where: { areaId: reviewSchedule.areaId, period: lastPeriod },
    })) === 0
  ) {
    const gqs = await db.guidingQuestion.findMany({ orderBy: { order: "asc" } });
    const pick = (sub: string) => gqs.find((g) => g.subCategory === sub)!;
    const prevAudit = await db.audit.create({
      data: {
        areaId: reviewSchedule.areaId,
        auditorId: auditor2.id, // cross-area: a different auditor recorded last month
        period: lastPeriod,
        status: "SUBMITTED",
        submittedAt: new Date(`${lastPeriod}-07T09:00:00`),
      },
    });
    const prevSeeds = [
      { gq: pick("Lantai"), location: "Koridor utilitas", description: "Masih terdapat ceceran pelumas kecil di dekat troli kerja dan jalur pejalan kaki.", kategori: "HIGH" as const, photoPath: "/demo/findings/lubricant-spill.webp" },
      { gq: pick("Garis Demarkasi"), location: "Jalur gudang", description: "Garis batas jalur pejalan kaki mulai pudar dan perlu dicat ulang.", kategori: "LOW" as const, photoPath: "/demo/findings/faded-floor-marking.webp" },
      { gq: pick("Material dan atau Suku cadang"), location: "Sudut area perawatan", description: "Suku cadang tidak aktif masih menumpuk di luar rak penyimpanan.", kategori: "LOW" as const, photoPath: "/demo/findings/cluttered-spare-parts.webp" },
    ];
    const previousStatuses = ["PROGRESS", "DONE", "NO_PROGRESS"] as const;
    for (const [index, f] of prevSeeds.entries()) {
      const prevFinding = await db.finding.create({
        data: {
          auditId: prevAudit.id,
          guidingQuestionId: f.gq.id,
          locationDetail: f.location,
          description: f.description,
          kategori: f.kategori,
          photoPath: f.photoPath,
          isRecurring: false,
          status: "PENDING_CAPA",
        },
      });
      await db.capa.create({
        data: {
          findingId: prevFinding.id,
          rootCause: "Penyebab temuan telah dianalisis oleh PIC area.",
          correctiveAction: "Tindakan korektif bulan lalu telah dicatat.",
          preventiveAction: "Tindakan preventif dipantau sampai selesai.",
          woScPoNumber: index === 0 ? "DEMO-WO-001" : null,
          dueDate: new Date(`${lastPeriod}-20T10:00:00+07:00`),
          status: previousStatuses[index],
          verifiedAt: new Date(`${lastPeriod}-21T10:00:00+07:00`),
          verifiedBy: "Komite Unit Demo",
        },
      });
    }
  }

  // The auditee has filled CAPA for two demo-area findings — status left null so they
  // sit in the Komite's "Menunggu Verifikasi" queue (the auditee does NOT set
  // the closing status; Komite does during verification). Seeded once.
  if (demoArea && (await db.capa.count({ where: { finding: { audit: { areaId: demoArea.id } } } })) === 0) {
    const demoFindings = await db.finding.findMany({
      where: { audit: { areaId: demoArea.id }, capa: { is: null } },
      orderBy: { createdAt: "asc" },
      take: 2,
    });
    const capaSeeds = [
      {
        rootCause: "Penutup wadah kerja tidak terpasang sempurna setelah digunakan.",
        correctiveAction: "Membersihkan area dan memasang kembali penutup wadah.",
        preventiveAction: "Menambahkan pemeriksaan penutup pada checklist harian.",
        woScPoNumber: "DEMO-WO-002", // nomor demo → Komite bisa set Progress
      },
      {
        rootCause: "Penanda lokasi pudar dan wadah tidak dikembalikan ke tempatnya.",
        correctiveAction: "Memperbarui penanda dan menata ulang wadah.",
        preventiveAction: "Melakukan pemeriksaan penataan harian oleh PIC shift.",
        woScPoNumber: null, // belum ada WO → Progress diblokir sampai dilengkapi
      },
    ];
    for (let i = 0; i < demoFindings.length && i < capaSeeds.length; i++) {
      await db.capa.create({
        data: { findingId: demoFindings[i].id, ...capaSeeds[i] },
      });
    }
  }

  // Backfill (idempotent): make sure at least one demo CAPA carries a WO number
  // (so Komite can demo "Progress") even on already-seeded DBs. Sets it on a
  // single CAPA only when none has one yet.
  if (demoArea) {
    const anyWo = await db.capa.count({
      where: { woScPoNumber: { not: null }, finding: { audit: { areaId: demoArea.id } } },
    });
    if (anyWo === 0) {
      const target = await db.capa.findFirst({
        where: { woScPoNumber: null, finding: { audit: { areaId: demoArea.id } } },
        orderBy: { createdAt: "asc" },
      });
      if (target) {
        await db.capa.update({
          where: { id: target.id },
          data: { woScPoNumber: "DEMO-WO-002" },
        });
      }
    }
    // Keep the demo audit on-time (≤ tgl 10) for the Skor Auditor demo.
    await db.audit.updateMany({
      where: { areaId: demoArea.id, period, status: "SUBMITTED" },
      data: { submittedAt: new Date(`${period}-08T09:00:00`) },
    });
  }

  // Synchronize the synthetic checklist by group+order so an existing demo DB
  // is sanitized when the seed is re-run, without deleting user responses.
  const checklistOrder = new Map<AreaGroup, number>();
  for (const item of CHECKLIST_ITEMS) {
    const order = checklistOrder.get(item.group) ?? 0;
    await db.checklistItem.upsert({
      where: { group_order: { group: item.group, order } },
      update: { text: item.text, active: true },
      create: { ...item, order },
    });
    checklistOrder.set(item.group, order + 1);
  }

  // Sample Red Tags for the demo area (varied urgency) — seed once. The first
  // one is linked to a finding to show the CAPA -> Red Tag
  // flow (a Ringkas finding whose follow-up is to red-tag the item).
  if (demoArea && (await db.redTag.count()) === 0) {
    const day = 1000 * 60 * 60 * 24;
    const now = Date.now();
    const year = new Date().getFullYear();
    const materialFinding = await db.finding.findFirst({
      where: {
        audit: { areaId: demoArea.id },
        guidingQuestion: { subCategory: "Material dan atau Suku cadang" },
      },
    });
    const seeds = [
      // approaching: registered 27 days ago, IN_AREA (30d) -> due in ~3 days
      { name: "Peralatan portabel rusak", category: "Peralatan", reason: "Rusak dan menunggu keputusan", location: "IN_AREA" as const, regAgo: 27, status: "OPEN" as const, findingId: materialFinding?.id ?? null },
      // overdue: registered 95 days ago, RT_AREA (90d) -> overdue ~5 days
      { name: "Wadah kosong tidak terpakai", category: "Material", reason: "Tidak diperlukan pada kegiatan simulasi", location: "RT_AREA" as const, regAgo: 95, status: "OPEN" as const, findingId: null },
      // decided
      { name: "Papan informasi lama", category: "Peralatan", reason: "Sudah diganti dengan contoh baru", location: "RT_AREA" as const, regAgo: 40, status: "DISPOSED" as const, findingId: null },
    ];
    let seq = 1;
    for (const s of seeds) {
      const registeredAt = new Date(now - s.regAgo * day);
      const dueDate = new Date(registeredAt.getTime() + RETENTION_DAYS[s.location] * day);
      await db.redTag.create({
        data: {
          tagNumber: `RT-${year}-${String(seq++).padStart(3, "0")}`,
          areaId: demoArea.id,
          findingId: s.findingId,
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

  // Backfill (idempotent): link one open red tag to the demo area's material
  // finding to demonstrate the CAPA -> Red Tag flow on already-seeded DBs.
  if (demoArea) {
    const materialFinding = await db.finding.findFirst({
      where: {
        audit: { areaId: demoArea.id },
        guidingQuestion: { subCategory: "Material dan atau Suku cadang" },
      },
    });
    if (materialFinding) {
      await db.redTag.updateMany({
        where: { areaId: demoArea.id, findingId: null, status: "OPEN" },
        data: { findingId: materialFinding.id },
      });
    }
  }

  // Backfill (idempotent): assign sequential per-audit finding numbers to any
  // findings created without one (number == 0). Once numbered they are skipped.
  const auditsToNumber = await db.finding.findMany({
    where: { number: 0 },
    select: { auditId: true },
    distinct: ["auditId"],
  });
  for (const { auditId } of auditsToNumber) {
    const fs = await db.finding.findMany({
      where: { auditId },
      orderBy: { createdAt: "asc" },
      select: { id: true, number: true },
    });
    let n = fs.reduce((m, f) => Math.max(m, f.number), 0);
    for (const f of fs) {
      if (f.number === 0) {
        n += 1;
        await db.finding.update({ where: { id: f.id }, data: { number: n } });
      }
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
        { action: "schedule.generate", entity: "AuditSchedule", summary: `Membuat jadwal audit demo periode ${period} untuk 12 area.`, userName: "Komite Demo", userEmail: "komite@5r.local" },
        { action: "audit.submit", entity: "Audit", summary: "Audit Zona A - Lantai 2 dikirim dengan 5 temuan demo.", userName: "Auditor Demo 1", userEmail: "auditor1@5r.local" },
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
