import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { navForRole, roleLabel } from "@/lib/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // PIC areas are tied to a specific area.
  const area = user.areaId
    ? await db.area.findUnique({ where: { id: user.areaId } })
    : null;

  // Quick links = the sections this role can reach (excluding Home itself).
  const quickLinks = navForRole(user.role).filter((n) => n.section !== "home");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Selamat datang,</p>
        <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identitas Pengguna</CardTitle>
          <CardDescription>Informasi akun yang sedang masuk.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama" value={user.name} />
          <Field label="Email" value={user.email} />
          <Field label="Peran" value={roleLabel(user.role)} />
          <Field label="Area" value={area ? area.name : "—"} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold">Menu Anda</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.section}
              href={link.href}
              className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="font-medium">{link.label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
