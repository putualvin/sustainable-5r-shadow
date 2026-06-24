"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginAction } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Demo accounts (mock auth — any/empty password). Click to prefill the email.
const ROLE_ACCOUNTS = [
  { email: "admin@5r.local", label: "Admin" },
  { email: "komite@5r.local", label: "Komite Unit" },
  { email: "auditor1@5r.local", label: "Auditor" },
  { email: "redtag@5r.local", label: "Koord. Red Tag" },
  { email: "gm@5r.local", label: "Management" },
];

// One PIC (auditee) per area — pic.<code>@5r.local, linked to that area.
const AREA_PICS = [
  { name: "Refinery Lt 1", code: "REF-1" },
  { name: "Refinery Lt 2", code: "REF-2" },
  { name: "Refinery Lt 3", code: "REF-3" },
  { name: "Fraksinasi Lt 1", code: "FRA-1" },
  { name: "Fraksinasi Lt 2", code: "FRA-2" },
  { name: "Fraksinasi Lt 3", code: "FRA-3" },
  { name: "Storage Area", code: "STG" },
  { name: "Loading Bay", code: "LDB" },
  { name: "Control Room", code: "CTR" },
  { name: "Workshop", code: "WSH" },
  { name: "Office Area", code: "OFF" },
  { name: "Laboratory", code: "LAB" },
];

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      // On success the action redirects; only errors return here.
      if (result?.error) setServerError(result.error);
    });
  }

  const pick = (email: string) =>
    setValue("email", email, { shouldValidate: true });

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nama@5r.local"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-danger">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Kata Sandi</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
        </div>

        {serverError && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Memproses…" : "Masuk"}
        </Button>
      </form>

      {/* Akun demo — klik untuk mengisi email, sandi boleh dikosongkan. */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground">
          Akun demo (klik untuk isi email · sandi bebas)
        </p>

        <div className="flex flex-wrap gap-1.5">
          {ROLE_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => pick(a.email)}
              className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {a.label}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            PIC Area (Auditee) ·{" "}
            <span className="font-normal">
              PIC Fraksinasi Lt 1 merangkap Auditor (contoh multi-peran)
            </span>
          </p>
          <ul className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-1.5 sm:grid-cols-2">
            {AREA_PICS.map((a) => {
              const email = `pic.${a.code.toLowerCase()}@5r.local`;
              return (
                <li key={a.code}>
                  <button
                    type="button"
                    onClick={() => pick(email)}
                    className="flex w-full flex-col rounded px-2 py-1 text-left transition-colors hover:bg-muted"
                    title={email}
                  >
                    <span className="text-xs font-medium text-foreground">
                      {a.name}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {email}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
