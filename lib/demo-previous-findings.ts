import type { CapaStatus, Kategori } from "@prisma/client";

import { db } from "@/lib/db";
import { prevPeriod } from "@/lib/format";

type DemoFindingSeed = {
  subCategory: string;
  locationDetail: string;
  description: string;
  kategori: Kategori;
  photoPath: string;
  capaStatus: CapaStatus;
  woScPoNumber: string | null;
};

const DEMO_PREVIOUS_FINDINGS: DemoFindingSeed[] = [
  {
    subCategory: "Lantai",
    locationDetail: "Koridor utilitas",
    description:
      "Masih terdapat ceceran pelumas kecil di dekat troli kerja dan jalur pejalan kaki.",
    kategori: "HIGH",
    photoPath: "/demo/findings/lubricant-spill.webp",
    capaStatus: "PROGRESS",
    woScPoNumber: "DEMO-WO-001",
  },
  {
    subCategory: "Garis Demarkasi",
    locationDetail: "Jalur gudang",
    description:
      "Garis batas jalur pejalan kaki mulai pudar dan perlu dicat ulang.",
    kategori: "LOW",
    photoPath: "/demo/findings/faded-floor-marking.webp",
    capaStatus: "DONE",
    woScPoNumber: null,
  },
  {
    subCategory: "Material dan atau Suku cadang",
    locationDetail: "Sudut area perawatan",
    description:
      "Suku cadang tidak aktif masih menumpuk di luar rak penyimpanan.",
    kategori: "LOW",
    photoPath: "/demo/findings/cluttered-spare-parts.webp",
    capaStatus: "NO_PROGRESS",
    woScPoNumber: null,
  },
];

/**
 * Ensures every audit opened in demo mode has previous-period findings to
 * review. This is intentionally idempotent and must never run in pilot or
 * production mode.
 */
export async function ensureDemoPreviousFindings({
  areaId,
  currentPeriod,
  currentAuditorId,
}: {
  areaId: string;
  currentPeriod: string;
  currentAuditorId: string;
}) {
  const previousPeriod = prevPeriod(currentPeriod);
  const submittedAt = new Date(`${previousPeriod}-07T02:00:00.000Z`);
  const dueDate = new Date(`${previousPeriod}-20T03:00:00.000Z`);

  let previousAudit = await db.audit.findFirst({
    where: { areaId, period: previousPeriod, status: "SUBMITTED" },
    orderBy: { createdAt: "asc" },
  });

  if (!previousAudit) {
    previousAudit = await db.audit.findFirst({
      where: { areaId, period: previousPeriod },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!previousAudit) {
    const previousAuditor = await db.user.findFirst({
      where: {
        roles: { has: "auditor" },
        id: { not: currentAuditorId },
      },
      orderBy: { email: "asc" },
      select: { id: true },
    });

    previousAudit = await db.audit.create({
      data: {
        areaId,
        auditorId: previousAuditor?.id ?? currentAuditorId,
        period: previousPeriod,
        status: "SUBMITTED",
        submittedAt,
      },
    });
  } else if (previousAudit.status !== "SUBMITTED") {
    previousAudit = await db.audit.update({
      where: { id: previousAudit.id },
      data: { status: "SUBMITTED", submittedAt },
    });
  }

  const questions = await db.guidingQuestion.findMany({
    where: {
      subCategory: {
        in: DEMO_PREVIOUS_FINDINGS.map((finding) => finding.subCategory),
      },
    },
    select: { id: true, subCategory: true },
  });
  const questionByCategory = new Map(
    questions.map((question) => [question.subCategory, question.id])
  );

  for (const [index, seed] of DEMO_PREVIOUS_FINDINGS.entries()) {
    const guidingQuestionId = questionByCategory.get(seed.subCategory);
    if (!guidingQuestionId) continue;

    let finding = await db.finding.findFirst({
      where: { auditId: previousAudit.id, guidingQuestionId },
      orderBy: { createdAt: "asc" },
    });

    if (finding) {
      const needsUpdate =
        finding.number === 0 ||
        finding.photoPath !== seed.photoPath ||
        finding.kategori === null ||
        finding.status !== "PENDING_CAPA";

      if (needsUpdate) {
        finding = await db.finding.update({
          where: { id: finding.id },
          data: {
            number: finding.number || index + 1,
            photoPath: seed.photoPath,
            kategori: finding.kategori ?? seed.kategori,
            status: "PENDING_CAPA",
          },
        });
      }
    } else {
      finding = await db.finding.create({
        data: {
          auditId: previousAudit.id,
          number: index + 1,
          guidingQuestionId,
          locationDetail: seed.locationDetail,
          description: seed.description,
          kategori: seed.kategori,
          photoPath: seed.photoPath,
          status: "PENDING_CAPA",
        },
      });
    }

    const capa = await db.capa.findUnique({
      where: { findingId: finding.id },
      select: { id: true, status: true },
    });
    const capaData = {
      rootCause: "Penataan dan pemeriksaan rutin belum dijalankan konsisten.",
      correctiveAction: "PIC area telah mencatat tindakan korektif bulan lalu.",
      preventiveAction: "Kondisi dipantau kembali pada audit periode berjalan.",
      woScPoNumber: seed.woScPoNumber,
      dueDate,
      status: seed.capaStatus,
      verifiedAt: new Date(`${previousPeriod}-21T03:00:00.000Z`),
      verifiedBy: "Komite Unit Demo",
    };

    if (!capa) {
      await db.capa.create({
        data: { findingId: finding.id, ...capaData },
      });
    } else if (!capa.status) {
      await db.capa.update({ where: { id: capa.id }, data: capaData });
    }
  }
}
