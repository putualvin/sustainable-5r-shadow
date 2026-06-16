"use client";

import { useRef } from "react";
import type { Role } from "@prisma/client";

import { setUserRole } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/rbac";

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

// Inline role picker: changing the value submits the form (server action).
export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setUserRole}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled}
        className={selectClass}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Ubah peran"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </form>
  );
}
