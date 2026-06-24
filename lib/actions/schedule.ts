"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, hasAnyRole } from "@/lib/rbac";
import { logAction } from "@/lib/audit-log";
import { formatPeriod } from "@/lib/format";

// Only komite_unit / admin manage the schedule (auditors view it read-only).
function canManage(roles: Role[]): boolean {
  return hasAnyRole(roles, "komite_unit", "admin");
}

// Users who can audit. With multi-role, a PIC may also be an auditor — they're
// included here but never assigned to audit their OWN area (conflict of
// interest is filtered when building the schedule).
async function activeAuditors() {
  return db.user.findMany({
    where: { roles: { has: "auditor" }, active: true },
    orderBy: { createdAt: "asc" },
  });
}

// Create (or refresh) a round-robin schedule for `period`: every active area is
// assigned an auditor in rotation, skipping anyone who is the PIC of that area.
export async function generateSchedule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "schedule") || !canManage(user.roles)) {
    redirect("/403");
  }

  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) redirect("/schedule");

  const [areas, auditors, existing] = await Promise.all([
    db.area.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    activeAuditors(),
    db.auditSchedule.findMany({
      where: { period },
      select: { areaId: true, _count: { select: { audits: true } } },
    }),
  ]);
  if (auditors.length === 0) redirect("/schedule?error=no-auditors");

  // Safe to re-run: keep areas whose audit has already started.
  const startedAreaIds = new Set(
    existing.filter((s) => s._count.audits > 0).map((s) => s.areaId)
  );

  for (let i = 0; i < areas.length; i++) {
    if (startedAreaIds.has(areas[i].id)) continue;
    let pick = auditors[i % auditors.length];
    // No self-audit: if the rotation lands on this area's own PIC, pick another.
    if (pick.areaId === areas[i].id) {
      pick = auditors.find((a) => a.areaId !== areas[i].id) ?? pick;
    }
    await db.auditSchedule.upsert({
      where: { areaId_period: { areaId: areas[i].id, period } },
      update: { auditorId: pick.id },
      create: { areaId: areas[i].id, period, auditorId: pick.id },
    });
  }

  await logAction({
    action: "schedule.generate",
    entity: "AuditSchedule",
    summary: `Membuat jadwal audit periode ${formatPeriod(period)} untuk ${areas.length} area.`,
  });

  revalidatePath("/schedule");
  revalidatePath("/");
  redirect(`/schedule?period=${period}`);
}

// Manually set the auditor for a single schedule row (komite/admin). Enforces
// no self-audit; blocked once the audit for that schedule has started.
export async function setScheduleAuditor(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "schedule") || !canManage(user.roles)) {
    redirect("/403");
  }

  const scheduleId = String(formData.get("scheduleId") ?? "");
  const auditorId = String(formData.get("auditorId") ?? "");

  const schedule = await db.auditSchedule.findUnique({
    where: { id: scheduleId },
    include: { _count: { select: { audits: true } }, area: { select: { name: true } } },
  });
  if (!schedule) redirect("/schedule");
  if (schedule._count.audits > 0) {
    redirect(`/schedule?period=${schedule.period}`); // already started — locked
  }

  const auditor = await db.user.findUnique({ where: { id: auditorId } });
  // Valid auditor, active, and not the PIC of the area being audited.
  if (
    !auditor ||
    !auditor.active ||
    !auditor.roles.includes("auditor") ||
    auditor.areaId === schedule.areaId
  ) {
    redirect(`/schedule?period=${schedule.period}`);
  }

  await db.auditSchedule.update({ where: { id: scheduleId }, data: { auditorId } });

  await logAction({
    action: "schedule.assign",
    entity: "AuditSchedule",
    summary: `Menugaskan ${auditor.name} untuk audit ${schedule.area.name} (${formatPeriod(schedule.period)}).`,
  });

  revalidatePath("/schedule");
  revalidatePath("/");
  redirect(`/schedule?period=${schedule.period}`);
}

// Reassign auditors for the period. Schedules whose audit has already started
// are left untouched; no auditor is assigned to their own area.
export async function shuffleSchedule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "schedule") || !canManage(user.roles)) {
    redirect("/403");
  }

  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) redirect("/schedule");

  const [schedules, auditors] = await Promise.all([
    db.auditSchedule.findMany({
      where: { period },
      include: { _count: { select: { audits: true } } },
      orderBy: { areaId: "asc" },
    }),
    activeAuditors(),
  ]);
  if (auditors.length === 0) redirect("/schedule?error=no-auditors");

  // Fisher–Yates shuffle of the auditor pool.
  const pool = [...auditors];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let k = 0;
  for (const s of schedules) {
    if (s._count.audits > 0) continue; // keep started audits with their auditor
    // Pick the next pool auditor who is not the PIC of this area.
    let chosen = pool[k % pool.length];
    for (let t = 0; t < pool.length; t++) {
      const cand = pool[(k + t) % pool.length];
      if (cand.areaId !== s.areaId) {
        chosen = cand;
        break;
      }
    }
    await db.auditSchedule.update({
      where: { id: s.id },
      data: { auditorId: chosen.id },
    });
    k++;
  }

  await logAction({
    action: "schedule.shuffle",
    entity: "AuditSchedule",
    summary: `Mengacak ulang penugasan auditor periode ${formatPeriod(period)} (${k} area).`,
  });

  revalidatePath("/schedule");
  revalidatePath("/");
  redirect(`/schedule?period=${period}`);
}
