"use client";

import { useRef } from "react";
import type { Role } from "@prisma/client";

import { setUserRoles } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/rbac";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

// Inline multi-role picker: toggling any checkbox submits the full set (server
// action). A user may hold several roles at once (e.g. Auditor + Auditee).
export function RolesSelect({
  userId,
  roles,
  disabled,
}: {
  userId: string;
  roles: Role[];
  disabled?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Komite Unit is independent — it cannot be combined with any other role.
  // Enforce mutual exclusivity in the UI before submitting (server re-checks).
  function handleChange(changed: Role) {
    const form = formRef.current;
    if (!form) return;
    const boxes = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="roles"]')
    );
    const find = (r: Role) => boxes.find((b) => b.value === r);
    const komite = find("komite_unit");
    if (changed === "komite_unit" && komite?.checked) {
      boxes.forEach((b) => {
        if (b.value !== "komite_unit") b.checked = false;
      });
    } else if (changed !== "komite_unit" && find(changed)?.checked && komite) {
      komite.checked = false;
    }
    form.requestSubmit();
  }

  return (
    <form ref={formRef} action={setUserRoles} className="flex flex-wrap gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      {ROLES.map((r) => {
        const checked = roles.includes(r);
        return (
          <label
            key={r}
            className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
              checked
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:border-primary/40"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              name="roles"
              value={r}
              defaultChecked={checked}
              disabled={disabled}
              className="sr-only"
              onChange={() => handleChange(r)}
            />
            {ROLE_LABELS[r]}
          </label>
        );
      })}
    </form>
  );
}
