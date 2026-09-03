import Link from "next/link";
import { Users, ScrollText, Power, MapPinned, LockKeyhole } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime, formatPeriod } from "@/lib/format";
import { toggleUserActive } from "@/lib/actions/admin";
import { RolesSelect } from "@/components/forms/role-select";
import { AreaPicSelect } from "@/components/forms/area-pic-select";
import { ScheduleAuditorSelect } from "@/components/forms/schedule-auditor-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  "self-demote": "Anda tidak dapat menurunkan peran admin Anda sendiri.",
  "self-deactivate": "Anda tidak dapat menonaktifkan akun Anda sendiri.",
  role: "Peran tidak valid.",
  area: "Area tidak valid atau sudah tidak aktif.",
  pic: "PIC harus merupakan pengguna aktif dengan peran Auditee/PIC.",
  "pic-auditor-conflict":
    "Pengguna tersebut sudah ditugaskan mengaudit area ini. Ubah auditor terlebih dahulu.",
  "komite-solo":
    "Komite Unit bersifat independen — peran ini tidak boleh digabung dengan peran lain.",
};

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminPage(
  props: {
    searchParams: Promise<{ error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const period = currentPeriod();
  const [users, areas, auditees, auditors, schedules, logs] = await Promise.all([
    db.user.findMany({
      include: { area: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    db.area.findMany({
      where: { active: true },
      include: {
        pics: {
          where: { active: true, roles: { has: "auditee" } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { code: "asc" },
    }),
    db.user.findMany({
      where: { active: true, roles: { has: "auditee" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { active: true, roles: { has: "auditor" } },
      select: { id: true, name: true, areaId: true },
      orderBy: { name: "asc" },
    }),
    db.auditSchedule.findMany({
      where: { period },
      include: {
        auditor: { select: { name: true } },
        _count: { select: { audits: true } },
      },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const scheduleByArea = new Map(schedules.map((schedule) => [schedule.areaId, schedule]));

  return (
    <div className="max-w-6xl space-y-6">
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

      {/* PIC area is a standing assignment; auditor is assigned per period. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="h-4 w-4" /> Penugasan Area · {formatPeriod(period)}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tetapkan PIC utama tiap area dan auditor periode berjalan. Auditor tidak dapat mengaudit area tempat dirinya menjadi PIC.
          </p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y text-left text-xs text-muted-foreground">
                  <th className="px-6 py-2 font-medium">Area</th>
                  <th className="px-3 py-2 font-medium">PIC Area</th>
                  <th className="px-3 py-2 font-medium">Auditor</th>
                  <th className="px-6 py-2 text-right font-medium">Status Jadwal</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => {
                  const schedule = scheduleByArea.get(area.id);
                  const started = Boolean(schedule?._count.audits);
                  return (
                    <tr key={area.id} className="border-b last:border-0 align-middle">
                      <td className="px-6 py-2 font-medium">{area.name}</td>
                      <td className="px-3 py-2">
                        <AreaPicSelect
                          areaId={area.id}
                          currentPicId={area.pics[0]?.id ?? null}
                          pics={auditees}
                          blockedUserId={schedule?.auditorId}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {schedule ? (
                          started ? (
                            <span>{schedule.auditor.name}</span>
                          ) : (
                            <ScheduleAuditorSelect
                              scheduleId={schedule.id}
                              areaId={area.id}
                              currentAuditorId={schedule.auditorId}
                              auditors={auditors}
                              returnTo="/admin"
                            />
                          )
                        ) : (
                          <Link href={`/schedule?period=${period}`} className="text-primary hover:underline">
                            Buat jadwal
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-2 text-right">
                        {schedule ? (
                          started ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                              <LockKeyhole className="h-3.5 w-3.5" /> Audit dimulai
                            </span>
                          ) : (
                            <span className="rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
                              Siap
                            </span>
                          )
                        ) : (
                          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                            Belum dibuat
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                        <RolesSelect userId={u.id} roles={u.roles} disabled={isSelf} />
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
