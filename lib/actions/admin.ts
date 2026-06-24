"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, rolesLabel } from "@/lib/rbac";
import { logAction } from "@/lib/audit-log";

const ROLES: Role[] = [
  "admin",
  "komite_unit",
  "auditor",
  "auditee",
  "kord_red_tag",
  "management",
];

// Set a user's full role set (one or more roles). A user may hold several
// roles at once — e.g. an area PIC (auditee) who also serves as an auditor.
export async function setUserRoles(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!actor || !canAccess(actor.roles, "admin")) redirect("/403");

  const userId = String(formData.get("userId") ?? "");
  const roles = formData
    .getAll("roles")
    .map(String)
    .filter((r): r is Role => ROLES.includes(r as Role));
  if (roles.length === 0) redirect("/admin?error=role");

  // Komite Unit is independent: an assessor sits outside the area, so the role
  // may NOT be combined with any other (unlike Auditor + Auditee, which one
  // area person can hold together).
  if (roles.includes("komite_unit") && roles.length > 1) {
    redirect("/admin?error=komite-solo");
  }

  // Guard against an admin removing their own admin role (lockout safety).
  if (userId === actor.id && !roles.includes("admin")) {
    redirect("/admin?error=self-demote");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (target) {
    await db.user.update({ where: { id: userId }, data: { roles } });
    await logAction({
      action: "user.role.update",
      entity: "User",
      summary: `Mengubah peran ${target.name} dari ${rolesLabel(target.roles)} menjadi ${rolesLabel(roles)}.`,
    });
  }
  revalidatePath("/admin");
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!actor || !canAccess(actor.roles, "admin")) redirect("/403");

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
