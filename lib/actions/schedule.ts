"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { logAction } from "@/lib/audit-log";
import { formatPeriod } from "@/lib/format";

// Only komite_unit / admin manage the schedule (auditors view it read-only).
function canManage(role: string): boolean {
  return role === "komite_unit" || role === "admin";
}

async function activeAuditors() {
  return db.user.findMany({
    where: { role: "auditor", active: true },
    orderBy: { createdAt: "asc" },
  });
}

// Create (or refresh) a round-robin schedule for `period`: every active area is
// assigned an auditor in rotation. Idempotent per (area, period).
export async function generateSchedule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "schedule") || !canManage(user.role)) {
    redirect("/403");
  }

  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) redirect("/schedule");

  const [areas, auditors] = await Promise.all([
    db.area.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
    activeAuditors(),
  ]);
  if (auditors.length === 0) redirect("/schedule?error=no-auditors");

  for (let i = 0; i < areas.length; i++) {
    const auditorId = auditors[i % auditors.length].id;
    await db.auditSchedule.upsert({
      where: { areaId_period: { areaId: areas[i].id, period } },
      update: { auditorId },
      create: { areaId: areas[i].id, period, auditorId },
    });
  }

  await logAction({
    action: "schedule.generate",
    entity: "AuditSchedule",
    summary: `Membuat jadwal audit periode ${formatPeriod(period)} untuk ${areas.length} area.`,
  });

  revalidatePath("/schedule");
  redirect(`/schedule?period=${period}`);
}

// Reassign auditors for the period. Schedules whose audit has already started
// are left untouched (so in-progress work isn't orphaned).
export async function shuffleSchedule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "schedule") || !canManage(user.role)) {
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
  const pool = auditors.map((a) => a.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let k = 0;
  for (const s of schedules) {
    if (s._count.audits > 0) continue; // keep started audits with their auditor
    await db.auditSchedule.update({
      where: { id: s.id },
      data: { auditorId: pool[k % pool.length] },
    });
    k++;
  }

  await logAction({
    action: "schedule.shuffle",
    entity: "AuditSchedule",
    summary: `Mengacak ulang penugasan auditor periode ${formatPeriod(period)} (${k} area).`,
  });

  revalidatePath("/schedule");
  redirect(`/schedule?period=${period}`);
}
