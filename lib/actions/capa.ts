"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, hasAnyRole } from "@/lib/rbac";
import { savePhoto } from "@/lib/upload";
import { calculate5RScore } from "@/lib/scoring";
import { logAction } from "@/lib/audit-log";
import { capaSchema, verifyCapaSchema } from "@/lib/schemas/capa";

// Recompute and persist an area's score for a period from its CAPA statuses.
// Only findings whose CAPA has been VERIFIED by Komite (status not null) are
// counted; unverified CAPAs are "not yet evaluated". Uses the single scoring
// engine — never inline the math.
export async function recomputeAreaScore(
  areaId: string,
  period: string
): Promise<void> {
  const findings = await db.finding.findMany({
    where: { audit: { areaId, period }, capa: { status: { not: null } } },
    select: { capa: { select: { status: true } } },
  });

  const done = findings.filter((f) => f.capa?.status === "DONE").length;
  const progress = findings.filter((f) => f.capa?.status === "PROGRESS").length;
  const noProgress = findings.filter((f) => f.capa?.status === "NO_PROGRESS").length;

  if (done + progress + noProgress === 0) return;

  const { finalScore } = calculate5RScore({ done, progress, noProgress });

  await db.score.upsert({
    where: { areaId_period: { areaId, period } },
    update: { countDone: done, countProgress: progress, countNoProgress: noProgress, finalScore },
    create: {
      areaId,
      period,
      countDone: done,
      countProgress: progress,
      countNoProgress: noProgress,
      finalScore,
    },
  });
}

export type CapaActionState = { error?: string };

// Auditee fills (or updates) the CAPA plan. NO status here — that is set by
// Komite during verification. A CAPA that has already been verified is locked.
export async function fillCapa(
  _prev: CapaActionState,
  formData: FormData
): Promise<CapaActionState> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "capa")) return { error: "Akses ditolak." };

  const parsed = capaSchema.safeParse({
    findingId: formData.get("findingId"),
    rootCause: formData.get("rootCause"),
    correctiveAction: formData.get("correctiveAction"),
    preventiveAction: formData.get("preventiveAction"),
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

  const photo = formData.get("afterPhoto");
  const afterPhoto = photo instanceof File ? await savePhoto(photo) : null;
  const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

  await db.capa.upsert({
    where: { findingId: parsed.data.findingId },
    update: {
      rootCause: parsed.data.rootCause,
      correctiveAction: parsed.data.correctiveAction,
      preventiveAction: parsed.data.preventiveAction,
      dueDate,
      ...(afterPhoto ? { afterPhoto } : {}),
    },
    create: {
      findingId: parsed.data.findingId,
      rootCause: parsed.data.rootCause,
      correctiveAction: parsed.data.correctiveAction,
      preventiveAction: parsed.data.preventiveAction,
      dueDate,
      afterPhoto,
      // status left null — awaiting Komite verification.
    },
  });

  revalidatePath("/capa");
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
      capa: { select: { id: true } },
      audit: { select: { areaId: true, period: true, area: { select: { name: true } } } },
    },
  });
  // Can only verify a CAPA the auditee has actually filled.
  if (!finding || !finding.capa) redirect("/capa");

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
  revalidatePath("/");
  redirect(`/capa/${parsed.data.findingId}?verified=1`);
}
