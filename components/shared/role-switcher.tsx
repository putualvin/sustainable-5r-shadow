"use client";

import { useState } from "react";
import { Repeat, Check } from "lucide-react";

import { switchRole } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

// Demo accounts to switch between (mock auth). Email prefix → role; the FRA-1
// PIC is multi-role (Auditee + Auditor).
const ACCOUNTS = [
  { email: "admin@5r.local", label: "Admin" },
  { email: "komite@5r.local", label: "Komite Unit" },
  { email: "auditor1@5r.local", label: "Auditor" },
  { email: "pic.ref-2@5r.local", label: "Auditee / PIC (Ref Lt 2)" },
  { email: "pic.fra-1@5r.local", label: "Auditor + PIC (Frak Lt 1)" },
  { email: "redtag@5r.local", label: "Koord. Red Tag" },
  { email: "gm@5r.local", label: "Management" },
];

export function RoleSwitcher({
  currentEmail,
  variant = "full",
  align = "up",
}: {
  currentEmail: string;
  variant?: "full" | "icon";
  align?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ganti peran (demo)"
        className={cn(
          variant === "full"
            ? "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            : "flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground hover:bg-white/15"
        )}
      >
        <Repeat className="h-4 w-4" />
        {variant === "full" && "Ganti Peran"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              "absolute z-50 w-60 overflow-hidden rounded-lg border bg-popover shadow-lg",
              align === "up" ? "bottom-full mb-2" : "top-full mt-2",
              variant === "icon" ? "right-0" : "left-0"
            )}
          >
            <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              Ganti peran (demo)
            </p>
            <ul className="max-h-72 overflow-y-auto py-1">
              {ACCOUNTS.map((a) => {
                const active = a.email === currentEmail;
                return (
                  <li key={a.email}>
                    <form action={switchRole}>
                      <input type="hidden" name="email" value={a.email} />
                      <button
                        type="submit"
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                          active && "bg-primary/5"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {a.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {a.email}
                          </span>
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
