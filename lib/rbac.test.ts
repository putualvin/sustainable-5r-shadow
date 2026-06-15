import { describe, it, expect } from "vitest";
import {
  canAccess,
  emailToRole,
  navForRole,
  roleLabel,
  sectionForPath,
} from "@/lib/rbac";

describe("emailToRole", () => {
  it("maps each email prefix to the correct role", () => {
    expect(emailToRole("admin@5r.local")).toBe("admin");
    expect(emailToRole("komite@5r.local")).toBe("komite_unit");
    expect(emailToRole("auditor1@5r.local")).toBe("auditor");
    expect(emailToRole("pic.refinery2@5r.local")).toBe("auditee");
    expect(emailToRole("redtag@5r.local")).toBe("kord_red_tag");
    expect(emailToRole("gm@5r.local")).toBe("management");
  });

  it("is case-insensitive", () => {
    expect(emailToRole("ADMIN@5R.LOCAL")).toBe("admin");
  });

  it("returns null for unknown prefixes", () => {
    expect(emailToRole("random@5r.local")).toBeNull();
  });
});

describe("canAccess", () => {
  it("allows admin into the admin section but not auditor", () => {
    expect(canAccess("admin", "admin")).toBe(true);
    expect(canAccess("auditor", "admin")).toBe(false);
  });

  it("allows auditor to input audits but not CAPA", () => {
    expect(canAccess("auditor", "audit")).toBe(true);
    expect(canAccess("auditor", "capa")).toBe(false);
  });

  it("allows auditee CAPA, checklist and red tag", () => {
    expect(canAccess("auditee", "capa")).toBe(true);
    expect(canAccess("auditee", "checklist")).toBe(true);
    expect(canAccess("auditee", "redtag")).toBe(true);
    expect(canAccess("auditee", "audit")).toBe(false);
  });

  it("gives management read access to scores and reports only", () => {
    expect(canAccess("management", "scores")).toBe(true);
    expect(canAccess("management", "reports")).toBe(true);
    expect(canAccess("management", "audit")).toBe(false);
    expect(canAccess("management", "admin")).toBe(false);
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
      expect(canAccess(r, "home")).toBe(true);
    }
  });
});

describe("navForRole", () => {
  it("auditee sees home/capa/checklist/redtag/documents but not admin", () => {
    const sections = navForRole("auditee").map((n) => n.section);
    expect(sections).toContain("capa");
    expect(sections).toContain("checklist");
    expect(sections).not.toContain("admin");
    expect(sections).not.toContain("audit");
  });

  it("admin sees the admin item", () => {
    expect(navForRole("admin").some((n) => n.section === "admin")).toBe(true);
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

describe("roleLabel", () => {
  it("returns Bahasa Indonesia labels", () => {
    expect(roleLabel("komite_unit")).toBe("Komite Unit");
    expect(roleLabel("auditee")).toBe("Auditee / PIC Area");
  });
});
