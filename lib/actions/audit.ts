"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { savePhoto } from "@/lib/upload";
import { logAction } from "@/lib/audit-log";
import { findingSchema } from "@/lib/schemas/finding";

// Start an audit from a schedule entry (auditor for that schedule, or komite/admin).
export async function startAuditFromSchedule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "audit")) redirect("/403");

  const scheduleId = String(formData.get("scheduleId") ?? "");
  const schedule = await db.auditSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) redirect("/audit");

  // Auditors may only start their own scheduled audits.
  if (user!.role === "auditor" && schedule!.auditorId !== user!.id) {
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
  if (!user || !canAccess(user.role, "audit")) return { error: "Akses ditolak." };

  const parsed = findingSchema.safeParse({
    auditId: formData.get("auditId"),
    guidingQuestionId: formData.get("guidingQuestionId"),
    locationDetail: formData.get("locationDetail") || undefined,
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const audit = await db.audit.findUnique({ where: { id: parsed.data.auditId } });
  if (!audit) return { error: "Audit tidak ditemukan." };
  if (audit.status !== "DRAFT")
    return { error: "Audit sudah dikirim dan tidak bisa diubah." };

  const photo = formData.get("photo");
  const photoPath = photo instanceof File ? await savePhoto(photo) : null;

  await db.finding.create({
    data: {
      auditId: parsed.data.auditId,
      guidingQuestionId: parsed.data.guidingQuestionId,
      locationDetail: parsed.data.locationDetail ?? null,
      description: parsed.data.description,
      photoPath,
    },
  });

  revalidatePath(`/audit/${parsed.data.auditId}`);
  return { ok: true };
}

export async function deleteFinding(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "audit")) redirect("/403");

  const id = String(formData.get("findingId") ?? "");
  const auditId = String(formData.get("auditId") ?? "");
  const finding = await db.finding.findUnique({ where: { id } });
  if (finding && finding.status === "DRAFT") {
    await db.finding.delete({ where: { id } });
  }
  revalidatePath(`/audit/${auditId}`);
}

// Submit final: lock the audit and distribute findings to the area PIC.
export async function submitAudit(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "audit")) redirect("/403");

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

  revalidatePath(`/audit/${auditId}`);
  revalidatePath("/audit");
  redirect(`/audit/${auditId}?submitted=1`);
}
