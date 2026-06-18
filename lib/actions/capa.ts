"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { savePhoto } from "@/lib/upload";
import { calculate5RScore } from "@/lib/scoring";
import { capaSchema } from "@/lib/schemas/capa";

// Recompute and persist an area's score for a period from its CAPA statuses.
// Only findings that already have a CAPA are counted (the rest are not yet
// evaluated). Uses the single scoring engine — never inline the math.
export async function recomputeAreaScore(
  areaId: string,
  period: string
): Promise<void> {
  const findings = await db.finding.findMany({
    where: { audit: { areaId, period }, capa: { isNot: null } },
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
    status: formData.get("status"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const finding = await db.finding.findUnique({
    where: { id: parsed.data.findingId },
    include: { audit: { select: { areaId: true, period: true } } },
  });
  if (!finding) return { error: "Temuan tidak ditemukan." };

  // Auditee may only fill CAPA for their own area.
  if (user.roles.includes("auditee") && finding.audit.areaId !== user.areaId) {
    return { error: "Anda hanya dapat mengisi CAPA untuk area Anda." };
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
      status: parsed.data.status,
      dueDate,
      ...(afterPhoto ? { afterPhoto } : {}),
    },
    create: {
      findingId: parsed.data.findingId,
      rootCause: parsed.data.rootCause,
      correctiveAction: parsed.data.correctiveAction,
      preventiveAction: parsed.data.preventiveAction,
      status: parsed.data.status,
      dueDate,
      afterPhoto,
    },
  });

  // Recompute the area score immediately.
  await recomputeAreaScore(finding.audit.areaId, finding.audit.period);

  revalidatePath("/capa");
  revalidatePath("/scores");
  revalidatePath("/");
  redirect("/capa?saved=1");
}
