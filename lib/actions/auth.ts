"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { emailToRole } from "@/lib/rbac";
import { loginSchema } from "@/lib/schemas/auth";

export type LoginResult = { error?: string };

export async function loginAction(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Data login tidak valid." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const role = emailToRole(email);
  if (!role) {
    return {
      error:
        "Email tidak dikenal. Gunakan awalan: admin / komite / auditor / pic / redtag / gm.",
    };
  }

  createSession(email);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}
