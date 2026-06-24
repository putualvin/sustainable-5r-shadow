"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, hasAnyRole } from "@/lib/rbac";
import { savePhoto } from "@/lib/upload";
import { calculateFinalScore } from "@/lib/scoring";
import { logAction } from "@/lib/audit-log";
import { capaSchema, verifyCapaSchema } from "@/lib/schemas/capa";

// Recompute and persist an area's two-layer score (§5.4) for a period.
// Status counts come from VERIFIED CAPAs only (Komite-set); Temuan Berulang is
// the count of findings flagged isRecurring. Uses the single scoring engine —
// never inline the math.
export async function recomputeAreaScore(
  areaId: string,
  period: string
): Promise<void> {
  const findings = await db.finding.findMany({
    where: { audit: { areaId, period } },
    select: { isRecurring: true, capa: { select: { status: true } } },
  });

  const done = findings.filter((f) => f.capa?.status === "DONE").length;
  const progress = findings.filter((f) => f.capa?.status === "PROGRESS").length;
  const noProgress = findings.filter((f) => f.capa?.status === "NO_PROGRESS").length;
  const recurring = findings.filter((f) => f.isRecurring).length;

  if (done + progress + noProgress === 0) return; // nothing evaluated yet

  const s = calculateFinalScore({ done, progress, noProgress, recurring });

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
    where: { areaId_period: { areaId, period } },
    update: data,
    create: { areaId, period, ...data },
  });
}

export type CapaActionState = { error?: string };

// Follow-up business limits (§5.2).
const FOLLOWUP_LIMIT = 25; // temuan per area per bulan
const CUTOFF_HOUR = 17; // pengisian ditutup pukul 17.00 WIB

// Current hour in Asia/Jakarta (WIB) — the deploy runs in UTC, so derive WIB.
function jakartaHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
}

// Auditee fills (or updates) the CAPA plan. NO status here — that is set by
// Komite during verification. A CAPA that has already been verified is locked.
export async function fillCapa(
  _prev: CapaActionState,
  formData: FormData
): Promise<CapaActionState> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "capa")) return { error: "Akses ditolak." };

  // Cut-off 17.00 WIB (§5.2).
  if (jakartaHour() >= CUTOFF_HOUR) {
    return {
      error: `Pengisian tindak lanjut sudah ditutup (cut-off pukul ${CUTOFF_HOUR}.00 WIB). Silakan lanjut besok.`,
    };
  }

  const parsed = capaSchema.safeParse({
    findingId: formData.get("findingId"),
    rootCause: formData.get("rootCause"),
    correctiveAction: formData.get("correctiveAction"),
    preventiveAction: formData.get("preventiveAction"),
    woScPoNumber: formData.get("woScPoNumber") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const finding = await db.finding.findUnique({
    where: { id: parsed.data.findingId },
    include: {
      capa: { select: { status: true } },
      audit: { select: { areaId: true, period: true } },
    },
  });
  if (!finding) return { error: "Temuan tidak ditemukan." };

  // Auditee may only fill CAPA for their own area.
  if (user.roles.includes("auditee") && finding.audit.areaId !== user.areaId) {
    return { error: "Anda hanya dapat mengisi CAPA untuk area Anda." };
  }

  // Once verified by Komite the CAPA is locked.
  if (finding.capa && finding.capa.status !== null) {
    return { error: "CAPA sudah diverifikasi Komite dan tidak dapat diubah." };
  }

  // Follow-up limit: max 25 temuan di-CAPA per area per bulan (§5.2). Only a NEW
  // CAPA counts against the cap; editing an existing one is always allowed.
  if (!finding.capa) {
    const filled = await db.capa.count({
      where: {
        finding: {
          audit: { areaId: finding.audit.areaId, period: finding.audit.period },
        },
      },
    });
    if (filled >= FOLLOWUP_LIMIT) {
      return {
        error: `Batas tindak lanjut tercapai (${FOLLOWUP_LIMIT} temuan/area/bulan).`,
      };
    }
  }

  const photo = formData.get("afterPhoto");
  const afterPhoto = photo instanceof File ? await savePhoto(photo) : null;
  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  const woScPoNumber = parsed.data.woScPoNumber?.trim() || null;

  await db.capa.upsert({
    where: { findingId: parsed.data.findingId },
    update: {
      rootCause: parsed.data.rootCause,
      correctiveAction: parsed.data.correctiveAction,
      preventiveAction: parsed.data.preventiveAction,
      woScPoNumber,
      dueDate,
      ...(afterPhoto ? { afterPhoto } : {}),
    },
    create: {
      findingId: parsed.data.findingId,
      rootCause: parsed.data.rootCause,
      correctiveAction: parsed.data.correctiveAction,
      preventiveAction: parsed.data.preventiveAction,
      woScPoNumber,
      dueDate,
      afterPhoto,
      // status left null — awaiting Komite verification.
    },
  });

  revalidatePath("/capa");
  revalidatePath(`/capa/${parsed.data.findingId}`);
  revalidatePath("/"); // home queues + CAPA KPI
  redirect("/capa?saved=1");
}

// Komite Unit (or admin) verifies a CAPA by setting its closing status. This is
// what drives the area score — the auditee never sets it.
export async function verifyCapa(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user.roles, "komite_unit", "admin")) redirect("/403");

  const parsed = verifyCapaSchema.safeParse({
    findingId: formData.get("findingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect("/capa");

  const finding = await db.finding.findUnique({
    where: { id: parsed.data.findingId },
    include: {
      capa: { select: { id: true, woScPoNumber: true } },
      audit: { select: { areaId: true, period: true, area: { select: { name: true } } } },
    },
  });
  // Can only verify a CAPA the auditee has actually filled.
  if (!finding || !finding.capa) redirect("/capa");

  // Status Progress wajib mencantumkan nomor WO/SC/PO (§5.3).
  if (parsed.data.status === "PROGRESS" && !finding.capa.woScPoNumber?.trim()) {
    redirect(`/capa/${parsed.data.findingId}?error=wo-required`);
  }

  await db.capa.update({
    where: { findingId: parsed.data.findingId },
    data: {
      status: parsed.data.status,
      verifiedAt: new Date(),
      verifiedBy: user.name,
    },
  });

  await recomputeAreaScore(finding.audit.areaId, finding.audit.period);

  await logAction({
    action: "capa.verify",
    entity: "Capa",
    summary: `Verifikasi CAPA ${finding.audit.area.name} → ${parsed.data.status}.`,
  });

  revalidatePath("/capa");
  revalidatePath(`/capa/${parsed.data.findingId}`);
  revalidatePath("/scores");
  revalidatePath(`/scores/${finding.audit.areaId}`);
  revalidatePath("/reports");
  revalidatePath("/");
  redirect(`/capa/${parsed.data.findingId}?verified=1`);
}
