"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { photoDataUrl } from "@/lib/upload";
import { logAction } from "@/lib/audit-log";
import { findingSchema } from "@/lib/schemas/finding";

// Start an audit from a schedule entry (auditor for that schedule, or komite/admin).
export async function startAuditFromSchedule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) redirect("/403");

  const scheduleId = String(formData.get("scheduleId") ?? "");
  const schedule = await db.auditSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) redirect("/audit");

  // Auditors may only start their own scheduled audits.
  if (user!.roles.includes("auditor") && schedule!.auditorId !== user!.id) {
    redirect("/403");
  }

  // Reuse an existing audit for this schedule if present.
  const existing = await db.audit.findFirst({
    where: { scheduleId: schedule!.id },
  });
  if (existing) redirect(`/audit/${existing.id}`);

  const audit = await db.audit.create({
    data: {
      areaId: schedule!.areaId,
      auditorId: schedule!.auditorId,
      scheduleId: schedule!.id,
      period: schedule!.period,
    },
  });
  redirect(`/audit/${audit.id}`);
}

export type FindingActionState = { ok?: boolean; error?: string };

// Add a finding to a draft audit (with optional camera/gallery photo).
export async function addFinding(
  _prev: FindingActionState,
  formData: FormData
): Promise<FindingActionState> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) return { error: "Akses ditolak." };

  const parsed = findingSchema.safeParse({
    auditId: formData.get("auditId"),
    guidingQuestionId: formData.get("guidingQuestionId"),
    locationDetail: formData.get("locationDetail") || undefined,
    description: formData.get("description"),
    kategori: formData.get("kategori"),
    isRecurring: formData.get("isRecurring") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const audit = await db.audit.findUnique({ where: { id: parsed.data.auditId } });
  if (!audit) return { error: "Audit tidak ditemukan." };
  if (audit.status !== "DRAFT")
    return { error: "Audit sudah dikirim dan tidak bisa diubah." };

  const photoPath = photoDataUrl(formData.get("photo"));

  await db.finding.create({
    data: {
      auditId: parsed.data.auditId,
      guidingQuestionId: parsed.data.guidingQuestionId,
      locationDetail: parsed.data.locationDetail ?? null,
      description: parsed.data.description,
      kategori: parsed.data.kategori,
      isRecurring: parsed.data.isRecurring ?? false,
      photoPath,
    },
  });

  revalidatePath(`/audit/${parsed.data.auditId}`);
  revalidatePath("/audit");
  return { ok: true };
}

// Verify a previous-period finding before the new audit (§5.4). Marking it
// "still exists" carries it into the current audit as a recurring finding;
// "handled" only records the verification. Re-marking replaces the verdict.
export async function reviewPreviousFinding(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) redirect("/403");

  const auditId = String(formData.get("auditId") ?? "");
  const prevFindingId = String(formData.get("prevFindingId") ?? "");
  const verdict = String(formData.get("verdict") ?? ""); // "exists" | "handled"

  const audit = await db.audit.findUnique({ where: { id: auditId } });
  if (!audit) redirect("/audit");
  if (user.roles.includes("auditor") && audit.auditorId !== user.id) redirect("/403");
  if (audit.status !== "DRAFT") redirect(`/audit/${auditId}`);

  const prev = await db.finding.findUnique({
    where: { id: prevFindingId },
    include: { audit: { select: { areaId: true, period: true } } },
  });
  // Guard: must be a finding from the SAME area and an earlier period.
  if (
    !prev ||
    prev.audit.areaId !== audit.areaId ||
    prev.audit.period >= audit.period
  ) {
    redirect(`/audit/${auditId}`);
  }

  const stillExists = verdict === "exists";

  // Replace any prior verdict (and its carried recurring finding).
  const existing = await db.findingReview.findUnique({
    where: { auditId_prevFindingId: { auditId, prevFindingId } },
  });
  if (existing) {
    if (existing.carriedFindingId) {
      await db.finding.deleteMany({
        where: { id: existing.carriedFindingId, status: "DRAFT" },
      });
    }
    await db.findingReview.delete({ where: { id: existing.id } });
  }

  let carriedFindingId: string | null = null;
  if (stillExists) {
    const carried = await db.finding.create({
      data: {
        auditId,
        guidingQuestionId: prev.guidingQuestionId,
        locationDetail: prev.locationDetail,
        description: prev.description,
        kategori: prev.kategori,
        isRecurring: true, // temuan berulang (§5.4)
        photoPath: prev.photoPath,
      },
    });
    carriedFindingId = carried.id;
  }

  await db.findingReview.create({
    data: { auditId, prevFindingId, stillExists, carriedFindingId },
  });

  revalidatePath(`/audit/${auditId}`);
  revalidatePath("/audit");
}

// Undo a previous-finding review (also removes any carried recurring finding).
export async function undoFindingReview(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) redirect("/403");

  const auditId = String(formData.get("auditId") ?? "");
  const reviewId = String(formData.get("reviewId") ?? "");

  const review = await db.findingReview.findUnique({
    where: { id: reviewId },
    include: { audit: { select: { auditorId: true, status: true } } },
  });
  if (!review || review.auditId !== auditId) redirect(`/audit/${auditId}`);
  if (user.roles.includes("auditor") && review.audit.auditorId !== user.id) {
    redirect("/403");
  }
  if (review.audit.status !== "DRAFT") redirect(`/audit/${auditId}`);

  if (review.carriedFindingId) {
    await db.finding.deleteMany({
      where: { id: review.carriedFindingId, status: "DRAFT" },
    });
  }
  await db.findingReview.delete({ where: { id: review.id } });

  revalidatePath(`/audit/${auditId}`);
  revalidatePath("/audit");
}

export async function deleteFinding(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) redirect("/403");

  const id = String(formData.get("findingId") ?? "");
  const auditId = String(formData.get("auditId") ?? "");
  const finding = await db.finding.findUnique({ where: { id } });
  if (finding && finding.status === "DRAFT") {
    await db.finding.delete({ where: { id } });
  }
  revalidatePath(`/audit/${auditId}`);
  revalidatePath("/audit");
}

// Submit final: lock the audit and distribute findings to the area PIC.
export async function submitAudit(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) redirect("/403");

  const auditId = String(formData.get("auditId") ?? "");
  const audit = await db.audit.findUnique({
    where: { id: auditId },
    include: {
      _count: { select: { findings: true } },
      area: { select: { name: true } },
    },
  });
  if (!audit || audit.status !== "DRAFT") redirect("/audit");

  // No minimum-count rule (explicit business decision). Submit as-is.
  await db.$transaction([
    db.audit.update({
      where: { id: auditId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    }),
    db.finding.updateMany({
      where: { auditId },
      data: { status: "PENDING_CAPA" },
    }),
  ]);

  await logAction({
    action: "audit.submit",
    entity: "Audit",
    summary: `Audit ${audit.area.name} dikirim dengan ${audit._count.findings} temuan.`,
  });

  // Findings are distributed to the area PIC's CAPA inbox + appear in queues.
  revalidatePath(`/audit/${auditId}`);
  revalidatePath("/audit");
  revalidatePath("/capa");
  revalidatePath("/");
  redirect(`/audit/${auditId}?submitted=1`);
}
