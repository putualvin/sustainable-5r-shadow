import { describe, it, expect } from "vitest";
import {
  canAccess,
  emailToRoles,
  navForRoles,
  hasAnyRole,
  roleLabel,
  rolesLabel,
  sectionForPath,
} from "@/lib/rbac";

describe("emailToRoles", () => {
  it("maps each email prefix to the correct role", () => {
    expect(emailToRoles("admin@5r.local")).toEqual(["admin"]);
    expect(emailToRoles("komite@5r.local")).toEqual(["komite_unit"]);
    expect(emailToRoles("auditor1@5r.local")).toEqual(["auditor"]);
    expect(emailToRoles("pic.refinery2@5r.local")).toEqual(["auditee"]);
    expect(emailToRoles("redtag@5r.local")).toEqual(["kord_red_tag"]);
    expect(emailToRoles("gm@5r.local")).toEqual(["management"]);
  });

  it("is case-insensitive", () => {
    expect(emailToRoles("ADMIN@5R.LOCAL")).toEqual(["admin"]);
  });

  it("returns an empty array for unknown prefixes", () => {
    expect(emailToRoles("random@5r.local")).toEqual([]);
  });
});

describe("canAccess", () => {
  it("allows admin into the admin section but not auditor", () => {
    expect(canAccess(["admin"], "admin")).toBe(true);
    expect(canAccess(["auditor"], "admin")).toBe(false);
  });

  it("allows auditor to input audits but not CAPA", () => {
    expect(canAccess(["auditor"], "audit")).toBe(true);
    expect(canAccess(["auditor"], "capa")).toBe(false);
  });

  it("allows auditee CAPA, checklist and red tag", () => {
    expect(canAccess(["auditee"], "capa")).toBe(true);
    expect(canAccess(["auditee"], "checklist")).toBe(true);
    expect(canAccess(["auditee"], "redtag")).toBe(true);
    expect(canAccess(["auditee"], "audit")).toBe(false);
  });

  it("takes the UNION of permissions across multiple roles", () => {
    const roles = ["auditor", "auditee"] as const;
    expect(canAccess([...roles], "audit")).toBe(true); // from auditor
    expect(canAccess([...roles], "capa")).toBe(true); // from auditee
    expect(canAccess([...roles], "checklist")).toBe(true); // from auditee
    expect(canAccess([...roles], "admin")).toBe(false); // neither grants
  });

  it("denies access for an empty role set", () => {
    expect(canAccess([], "home")).toBe(false);
  });

  it("gives management read access to scores and reports only", () => {
    expect(canAccess(["management"], "scores")).toBe(true);
    expect(canAccess(["management"], "reports")).toBe(true);
    expect(canAccess(["management"], "audit")).toBe(false);
    expect(canAccess(["management"], "admin")).toBe(false);
  });

  it("lets every role see home", () => {
    for (const r of [
      "admin",
      "komite_unit",
      "auditor",
      "auditee",
      "kord_red_tag",
      "management",
    ] as const) {
      expect(canAccess([r], "home")).toBe(true);
    }
  });
});

describe("hasAnyRole", () => {
  it("is true when at least one target role is held", () => {
    expect(hasAnyRole(["auditee", "auditor"], "komite_unit", "auditor")).toBe(true);
    expect(hasAnyRole(["auditee"], "komite_unit", "admin")).toBe(false);
  });
});

describe("navForRoles", () => {
  it("auditee sees home/capa/checklist/redtag/documents but not admin", () => {
    const sections = navForRoles(["auditee"]).map((n) => n.section);
    expect(sections).toContain("capa");
    expect(sections).toContain("checklist");
    expect(sections).not.toContain("admin");
    expect(sections).not.toContain("audit");
  });

  it("a combined auditor+auditee sees both audit and capa", () => {
    const sections = navForRoles(["auditor", "auditee"]).map((n) => n.section);
    expect(sections).toContain("audit");
    expect(sections).toContain("capa");
  });

  it("admin sees the admin item", () => {
    expect(navForRoles(["admin"]).some((n) => n.section === "admin")).toBe(true);
  });
});

describe("sectionForPath", () => {
  it("maps paths to sections", () => {
    expect(sectionForPath("/")).toBe("home");
    expect(sectionForPath("/audit")).toBe("audit");
    expect(sectionForPath("/audit/new")).toBe("audit");
    expect(sectionForPath("/admin/users")).toBe("admin");
    expect(sectionForPath("/login")).toBeNull();
  });
});

describe("roleLabel / rolesLabel", () => {
  it("returns Bahasa Indonesia labels", () => {
    expect(roleLabel("komite_unit")).toBe("Komite Unit");
    expect(roleLabel("auditee")).toBe("Auditee / PIC Area");
  });

  it("joins multiple role labels", () => {
    expect(rolesLabel(["auditor", "auditee"])).toBe("Auditor · Auditee / PIC Area");
    expect(rolesLabel([])).toBe("—");
  });
});
