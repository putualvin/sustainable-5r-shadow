import Link from "next/link";
import { ClipboardCheck, ChevronRight, CalendarClock } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { startAuditFromSchedule } from "@/lib/actions/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPeriod } from "@/lib/format";

export default async function AuditListPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isAuditor = user.roles.includes("auditor");
  const scope = isAuditor ? { auditorId: user.id } : {};

  const [schedules, audits] = await Promise.all([
    db.auditSchedule.findMany({
      where: scope,
      include: { area: true, auditor: { select: { name: true } } },
      orderBy: [{ period: "desc" }, { area: { code: "asc" } }],
    }),
    db.audit.findMany({
      where: scope,
      include: {
        area: true,
        auditor: { select: { name: true } },
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const startedScheduleIds = new Set(
    audits.map((a) => a.scheduleId).filter(Boolean)
  );
  const pending = schedules.filter((s) => !startedScheduleIds.has(s.id));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit 5R</h1>
        <p className="text-sm text-muted-foreground">
          {isAuditor ? "Jadwal & audit Anda" : "Seluruh jadwal & audit"}
        </p>
      </div>

      {/* Jadwal yang belum dimulai */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarClock className="h-4 w-4" /> Jadwal Menunggu
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tidak ada jadwal audit yang menunggu.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.area.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPeriod(s.period)}
                      {!isAuditor ? ` · ${s.auditor.name}` : ""}
                    </p>
                  </div>
                  <form action={startAuditFromSchedule}>
                    <input type="hidden" name="scheduleId" value={s.id} />
                    <Button size="sm" className="gap-1">
                      <ClipboardCheck className="h-4 w-4" /> Mulai
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Daftar audit */}
      <section className="space-y-3">
        <h2 className="font-semibold">Audit</h2>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada audit.</p>
        ) : (
          <Card>
            <ul className="divide-y">
              {audits.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/audit/${a.id}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.area.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPeriod(a.period)} · {a._count.findings} temuan
                        {!isAuditor ? ` · ${a.auditor.name}` : ""}
                      </p>
                    </div>
                    <AuditStatusBadge status={a.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function AuditStatusBadge({ status }: { status: "DRAFT" | "SUBMITTED" }) {
  const map = {
    DRAFT: { label: "Draft", cls: "bg-warning/10 text-warning" },
    SUBMITTED: { label: "Terkirim", cls: "bg-success/10 text-success" },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
