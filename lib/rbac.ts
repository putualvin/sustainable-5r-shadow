import type { Role } from "@prisma/client";

// Mock auth: map an email's leading keyword to a role (shadow build only).
// Pure + edge-safe (no DB) so it can be used in middleware too.
const PREFIX_ROLE: { prefix: string; role: Role }[] = [
  { prefix: "admin", role: "admin" },
  { prefix: "komite", role: "komite_unit" },
  { prefix: "auditor", role: "auditor" },
  { prefix: "pic", role: "auditee" },
  { prefix: "redtag", role: "kord_red_tag" },
  { prefix: "gm", role: "management" },
];

export function emailToRole(email: string): Role | null {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  for (const { prefix, role } of PREFIX_ROLE) {
    if (local.startsWith(prefix)) return role;
  }
  return null;
}

// Bahasa Indonesia labels for each role (shown in UI).
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  komite_unit: "Komite Unit",
  auditor: "Auditor",
  auditee: "Auditee / PIC Area",
  kord_red_tag: "Koordinator Red Tag",
  management: "Management",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

// App sections used for navigation + access control.
export type Section =
  | "home"
  | "audit"
  | "capa"
  | "checklist"
  | "redtag"
  | "scores"
  | "schedule"
  | "reports"
  | "documents"
  | "admin";

// Which roles may access which section. Single source of truth for RBAC.
export const SECTION_ACCESS: Record<Section, Role[]> = {
  home: ["admin", "komite_unit", "auditor", "auditee", "kord_red_tag", "management"],
  audit: ["auditor", "komite_unit", "admin"],
  capa: ["auditee", "komite_unit", "admin"],
  checklist: ["auditee", "admin"],
  redtag: ["auditee", "kord_red_tag", "admin"],
  scores: ["komite_unit", "auditor", "management", "admin"],
  schedule: ["komite_unit", "auditor", "admin"],
  reports: ["komite_unit", "management", "admin"],
  documents: ["admin", "komite_unit", "auditor", "auditee", "kord_red_tag", "management"],
  admin: ["admin"],
};

export function canAccess(role: Role, section: Section): boolean {
  return SECTION_ACCESS[section]?.includes(role) ?? false;
}

// Navigation items (pure data; icons attached in the UI layer).
export type NavItem = { section: Section; href: string; label: string };

export const NAV_ITEMS: NavItem[] = [
  { section: "home", href: "/", label: "Beranda" },
  { section: "audit", href: "/audit", label: "Audit" },
  { section: "capa", href: "/capa", label: "CAPA" },
  { section: "checklist", href: "/checklist", label: "Checklist Harian" },
  { section: "redtag", href: "/redtag", label: "Red Tag" },
  { section: "scores", href: "/scores", label: "Skor 5R" },
  { section: "schedule", href: "/schedule", label: "Jadwal" },
  { section: "reports", href: "/reports", label: "Laporan" },
  { section: "documents", href: "/documents", label: "Dokumen" },
  { section: "admin", href: "/admin", label: "Admin" },
];

// Nav items a given role is allowed to see.
export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.section));
}

// Map a section to the roles allowed (used by middleware/route guards).
export function rolesForSection(section: Section): Role[] {
  return SECTION_ACCESS[section] ?? [];
}

// Derive the section from a pathname (for route guards). Returns null when the
// path is not a guarded app section (e.g. /login, /403).
export function sectionForPath(pathname: string): Section | null {
  if (pathname === "/") return "home";
  const seg = pathname.split("/")[1] ?? "";
  const map: Record<string, Section> = {
    audit: "audit",
    capa: "capa",
    checklist: "checklist",
    redtag: "redtag",
    scores: "scores",
    schedule: "schedule",
    reports: "reports",
    documents: "documents",
    admin: "admin",
  };
  return map[seg] ?? null;
}
