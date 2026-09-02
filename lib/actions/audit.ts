"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, hasAnyRole } from "@/lib/rbac";
import { photoDataUrl } from "@/lib/upload";
import { logAction } from "@/lib/audit-log";
import { findingPrioritySchema, findingSchema } from "@/lib/schemas/finding";

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

// Next sequential finding number within an audit (area+period): 1, 2, 3, …
async function nextFindingNumber(auditId: string): Promise<number> {
  const agg = await db.finding.aggregate({
    where: { auditId },
    _max: { number: true },
  });
  return (agg._max.number ?? 0) + 1;
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const audit = await db.audit.findUnique({ where: { id: parsed.data.auditId } });
  if (!audit) return { error: "Audit tidak ditemukan." };
  if (!user.roles.includes("auditor") || audit.auditorId !== user.id) {
    return { error: "Anda hanya dapat mengubah audit yang ditugaskan kepada Anda." };
  }
  if (audit.status !== "DRAFT")
    return { error: "Audit sudah dikirim dan tidak bisa diubah." };

  const photoPath = photoDataUrl(formData.get("photo"));

  await db.finding.create({
    data: {
      auditId: parsed.data.auditId,
      number: await nextFindingNumber(parsed.data.auditId),
      guidingQuestionId: parsed.data.guidingQuestionId,
      locationDetail: parsed.data.locationDetail ?? null,
      description: parsed.data.description,
      // Legacy demo databases still require a stored enum value. LOW is only
      // a compatibility placeholder while status is DRAFT; the UI treats the
      // priority as unassigned until Komite Unit explicitly sets it.
      kategori: "LOW",
      isRecurring: false,
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
  if (!user.roles.includes("auditor") || audit.auditorId !== user.id) redirect("/403");
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
        number: await nextFindingNumber(auditId),
        guidingQuestionId: prev.guidingQuestionId,
        locationDetail: prev.locationDetail,
        description: prev.description,
        // Compatibility placeholder for older demo databases where kategori
        // is still NOT NULL. It is hidden until Komite Unit assigns priority.
        kategori: prev.kategori ?? "LOW",
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
  if (!user.roles.includes("auditor") || review.audit.auditorId !== user.id) {
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
  const finding = await db.finding.findUnique({
    where: { id },
    include: { audit: { select: { auditorId: true, status: true } } },
  });
  if (!finding) redirect("/audit");
  if (!user.roles.includes("auditor") || finding.audit.auditorId !== user.id) {
    redirect("/403");
  }
  if (finding.status === "DRAFT" && finding.audit.status === "DRAFT") {
    await db.finding.delete({ where: { id } });
  }
  revalidatePath(`/audit/${finding.auditId}`);
  revalidatePath("/audit");
}

// Komite Unit owns the Low/High decision. Assigning a priority releases the
// submitted finding to the area's CAPA queue.
export async function setFindingPriority(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasAnyRole(user.roles, "komite_unit", "admin")) redirect("/403");

  const parsed = findingPrioritySchema.safeParse({
    findingId: formData.get("findingId"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) redirect("/audit");

  const finding = await db.finding.findUnique({
    where: { id: parsed.data.findingId },
    include: {
      audit: { select: { id: true, status: true, area: { select: { name: true } } } },
    },
  });
  if (!finding || finding.audit.status !== "SUBMITTED") redirect("/audit");

  await db.finding.update({
    where: { id: finding.id },
    data: {
      kategori: parsed.data.priority,
      status: "PENDING_CAPA",
    },
  });

  await logAction({
    action: "finding.priority.set",
    entity: "Finding",
    summary: `Prioritas temuan #${finding.number} ${finding.audit.area.name} ditetapkan ${parsed.data.priority} oleh Komite Unit.`,
  });

  revalidatePath(`/audit/${finding.audit.id}`);
  revalidatePath("/audit");
  revalidatePath("/capa");
  revalidatePath("/scores");
  revalidatePath("/");
}

// Submit final: lock the audit and send its findings to Komite Unit.
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
  if (!user.roles.includes("auditor") || audit.auditorId !== user.id) {
    redirect("/403");
  }

  // No minimum-count rule (explicit business decision). Submit as-is. The
  // findings first enter the Komite priority queue; they are distributed to
  // the area's CAPA queue after Low/High has been assigned.
  await db.$transaction([
    db.audit.update({
      where: { id: auditId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    }),
    db.finding.updateMany({
      where: { auditId },
      // Keep the legacy stored placeholder; PENDING_PRIORITY is the source of
      // truth that tells the UI and CAPA flow priority is not assigned yet.
      data: { status: "PENDING_PRIORITY" },
    }),
  ]);

  await logAction({
    action: "audit.submit",
    entity: "Audit",
    summary: `Audit ${audit.area.name} dikirim dengan ${audit._count.findings} temuan.`,
  });

  // Findings appear in the Komite priority queue first.
  revalidatePath(`/audit/${auditId}`);
  revalidatePath("/audit");
  revalidatePath("/capa");
  revalidatePath("/");
  redirect(`/audit/${auditId}?submitted=1`);
}
