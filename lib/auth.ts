import "server-only";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { emailToRoles } from "@/lib/rbac";

const COOKIE_NAME = "session_email";
const ROLES_COOKIE = "session_roles";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  areaId: string | null;
};

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

// Set the session cookies (Next.js 14: cookies() is synchronous). `roles` is
// stored so the edge middleware can authorise without a DB call.
export function createSession(email: string, roles: Role[]): void {
  const value = email.trim().toLowerCase();
  cookies().set(COOKIE_NAME, value, COOKIE_OPTS);
  cookies().set(ROLES_COOKIE, roles.join(","), COOKIE_OPTS);
}

export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
  cookies().delete(ROLES_COOKIE);
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Resolve the logged-in user. The DB row is authoritative for roles + area;
// otherwise we fall back to a virtual user derived from the email prefix.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const email = cookies().get(COOKIE_NAME)?.value;
  if (!email) return null;

  const fallbackRoles = emailToRoles(email);
  if (fallbackRoles.length === 0) return null;

  const dbUser = await db.user.findUnique({ where: { email } });
  if (dbUser && dbUser.active) {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      roles: dbUser.roles.length > 0 ? dbUser.roles : fallbackRoles,
      areaId: dbUser.areaId,
    };
  }

  return {
    id: "virtual",
    name: nameFromEmail(email),
    email,
    roles: fallbackRoles,
    areaId: null,
  };
}
