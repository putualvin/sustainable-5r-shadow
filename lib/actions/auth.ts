"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { emailToRoles } from "@/lib/rbac";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/schemas/auth";

export type LoginResult = { error?: string };

export async function loginAction(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Data login tidak valid." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const prefixRoles = emailToRoles(email);
  if (prefixRoles.length === 0) {
    return {
      error:
        "Email tidak dikenal. Gunakan awalan: admin / komite / auditor / pic / redtag / gm.",
    };
  }

  // Real users carry their full role set in the DB (may be multiple roles);
  // virtual/mock users fall back to the single prefix-derived role.
  const dbUser = await db.user.findUnique({ where: { email } });
  const roles =
    dbUser && dbUser.active && dbUser.roles.length > 0
      ? dbUser.roles
      : prefixRoles;

  createSession(email, roles);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}
