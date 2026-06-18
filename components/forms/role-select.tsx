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
              onChange={() => formRef.current?.requestSubmit()}
            />
            {ROLE_LABELS[r]}
          </label>
        );
      })}
    </form>
  );
}
