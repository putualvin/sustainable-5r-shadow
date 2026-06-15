import "server-only";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { emailToRole } from "@/lib/rbac";

const COOKIE_NAME = "session_email";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  areaId: string | null;
};

// Set the session cookie (Next.js 14: cookies() is synchronous).
export function createSession(email: string): void {
  cookies().set(COOKIE_NAME, email.trim().toLowerCase(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Resolve the logged-in user. Uses the seeded DB row if present; otherwise
// falls back to a virtual user derived from the email prefix (mock auth).
export async function getCurrentUser(): Promise<SessionUser | null> {
  const email = cookies().get(COOKIE_NAME)?.value;
  if (!email) return null;

  const role = emailToRole(email);
  if (!role) return null;

  const dbUser = await db.user.findUnique({ where: { email } });
  if (dbUser && dbUser.active) {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      areaId: dbUser.areaId,
    };
  }

  return {
    id: "virtual",
    name: nameFromEmail(email),
    email,
    role,
    areaId: null,
  };
}
