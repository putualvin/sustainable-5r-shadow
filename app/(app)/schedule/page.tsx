import { CalendarClock, Shuffle, Sparkles } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPeriod, formatDate } from "@/lib/format";
import { generateSchedule, shuffleSchedule } from "@/lib/actions/schedule";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodTabs } from "@/components/shared/period-tabs";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS = {
  none: { label: "Belum mulai", cls: "bg-muted text-muted-foreground" },
  DRAFT: { label: "Draft", cls: "bg-warning/10 text-warning" },
  SUBMITTED: { label: "Terkirim", cls: "bg-success/10 text-success" },
} as const;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { period?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const canManage = user.role === "komite_unit" || user.role === "admin";

  // Periods that have schedules, plus the current month so a fresh period can
  // always be generated.
  const periodRows = await db.auditSchedule.findMany({
    distinct: ["period"],
    select: { period: true },
    orderBy: { period: "desc" },
  });
  const periods = Array.from(
    new Set([currentPeriod(), ...periodRows.map((p) => p.period)])
  ).sort((a, b) => b.localeCompare(a));
  const period =
    searchParams.period && periods.includes(searchParams.period)
      ? searchParams.period
      : periods[0];

  const [schedules, audits] = await Promise.all([
    db.auditSchedule.findMany({
      where: { period },
      include: { area: true, auditor: { select: { name: true } } },
      orderBy: { area: { code: "asc" } },
    }),
    db.audit.findMany({
      where: { period },
      select: { scheduleId: true, status: true },
    }),
  ]);

  const statusBySchedule = new Map(
    audits.filter((a) => a.scheduleId).map((a) => [a.scheduleId!, a.status])
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal Audit</h1>
          <p className="text-sm text-muted-foreground">
            Penugasan auditor per area · {formatPeriod(period)}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 print:hidden">
            {schedules.length === 0 ? (
              <form action={generateSchedule}>
                <input type="hidden" name="period" value={period} />
                <Button size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Buat Jadwal
                </Button>
              </form>
            ) : (
              <form action={shuffleSchedule}>
                <input type="hidden" name="period" value={period} />
                <Button size="sm" variant="outline" className="gap-2">
                  <Shuffle className="h-4 w-4" /> Acak Ulang
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      <PeriodTabs periods={periods} active={period} basePath="/schedule" />

      {searchParams.error === "no-auditors" && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          Tidak ada auditor aktif. Tambahkan auditor di menu Admin terlebih dahulu.
        </p>
      )}

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Belum ada jadwal untuk periode ini</p>
          {canManage ? (
            <p className="max-w-sm text-sm text-muted-foreground">
              Klik “Buat Jadwal” untuk menugaskan auditor ke seluruh area secara bergiliran.
            </p>
          ) : (
            <p className="max-w-sm text-sm text-muted-foreground">
              Komite Unit belum menyusun jadwal untuk periode ini.
            </p>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Area</th>
                    <th className="px-4 py-2 font-medium">Auditor</th>
                    <th className="px-4 py-2 font-medium">Batas Waktu</th>
                    <th className="px-4 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => {
                    const st = statusBySchedule.get(s.id);
                    const badge = st ? STATUS[st] : STATUS.none;
                    return (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{s.area.name}</td>
                        <td className="px-4 py-2">{s.auditor.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {s.dueDate ? formatDate(s.dueDate) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
