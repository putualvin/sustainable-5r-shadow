"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, roleLabel } from "@/lib/rbac";
import { logAction } from "@/lib/audit-log";

const ROLES: Role[] = [
  "admin",
  "komite_unit",
  "auditor",
  "auditee",
  "kord_red_tag",
  "management",
];

export async function setUserRole(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!actor || !canAccess(actor.role, "admin")) redirect("/403");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) redirect("/admin?error=role");

  // Guard against an admin locking themselves out of admin.
  if (userId === actor.id && role !== "admin") {
    redirect("/admin?error=self-demote");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (target && target.role !== role) {
    await db.user.update({ where: { id: userId }, data: { role } });
    await logAction({
      action: "user.role.update",
      entity: "User",
      summary: `Mengubah peran ${target.name} dari ${roleLabel(target.role)} menjadi ${roleLabel(role)}.`,
    });
  }
  revalidatePath("/admin");
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!actor || !canAccess(actor.role, "admin")) redirect("/403");

  const userId = String(formData.get("userId") ?? "");
  if (userId === actor.id) redirect("/admin?error=self-deactivate");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (target) {
    await db.user.update({
      where: { id: userId },
      data: { active: !target.active },
    });
    await logAction({
      action: "user.active.toggle",
      entity: "User",
      summary: `${target.active ? "Menonaktifkan" : "Mengaktifkan"} akun ${target.name}.`,
    });
  }
  revalidatePath("/admin");
}
