import { Users, ScrollText, Power } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { toggleUserActive } from "@/lib/actions/admin";
import { RoleSelect } from "@/components/forms/role-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  "self-demote": "Anda tidak dapat menurunkan peran admin Anda sendiri.",
  "self-deactivate": "Anda tidak dapat menonaktifkan akun Anda sendiri.",
  role: "Peran tidak valid.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [users, logs] = await Promise.all([
    db.user.findMany({
      include: { area: { select: { name: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manajemen pengguna &amp; log aktivitas
        </p>
      </div>

      {searchParams.error && ERRORS[searchParams.error] && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {ERRORS[searchParams.error]}
        </p>
      )}

      {/* Pengguna */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Pengguna ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y text-left text-xs text-muted-foreground">
                  <th className="px-6 py-2 font-medium">Nama</th>
                  <th className="px-3 py-2 font-medium">Area</th>
                  <th className="px-3 py-2 font-medium">Peran</th>
                  <th className="px-6 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === user.id;
                  return (
                    <tr key={u.id} className="border-b last:border-0 align-middle">
                      <td className="px-6 py-2">
                        <p className="font-medium">
                          {u.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Anda)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {u.area?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <RoleSelect userId={u.id} role={u.role} disabled={isSelf} />
                      </td>
                      <td className="px-6 py-2 text-right">
                        <form action={toggleUserActive} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <Button
                            size="sm"
                            variant={u.active ? "outline" : "secondary"}
                            type="submit"
                            disabled={isSelf}
                            className="gap-1"
                          >
                            <Power className="h-3.5 w-3.5" />
                            {u.active ? "Aktif" : "Nonaktif"}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Log aktivitas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Log Aktivitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <ul className="divide-y">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm">{l.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.userName} · {l.entity}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(l.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
