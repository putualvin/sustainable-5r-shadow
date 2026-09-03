import Link from "next/link";
import { ClipboardCheck, ChevronRight, CalendarClock } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { startAuditFromSchedule } from "@/lib/actions/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleSwitcher } from "@/components/shared/role-switcher";
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
  const activeAudits = isAuditor
    ? audits.filter((audit) => audit.status === "DRAFT")
    : [];
  const historyAudits = isAuditor
    ? audits.filter((audit) => audit.status === "SUBMITTED")
    : audits;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit 5R</h1>
        <p className="text-sm text-muted-foreground">
          {isAuditor ? "Jadwal & audit Anda" : "Seluruh jadwal & audit"}
        </p>
      </div>

      {isAuditor ? (
        <div className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm">
          Untuk menambah temuan atau menandai temuan bulan sebelumnya, buka
          audit pada bagian <strong>Audit Aktif — Bisa Diisi</strong>.
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Peran saat ini tidak dapat mengisi audit. Gunakan peran Auditor
            untuk menambah temuan dan melakukan verifikasi bulan sebelumnya.
          </p>
          <div className="shrink-0 sm:w-52">
            <RoleSwitcher
              currentEmail={user.email}
              variant="full"
              align="down"
            />
          </div>
        </div>
      )}

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

      {isAuditor && (
        <AuditSection
          title="Audit Aktif — Bisa Diisi"
          audits={activeAudits}
          showAuditor={false}
          emptyMessage="Belum ada audit Draft. Mulai dari Jadwal Menunggu jika tersedia."
        />
      )}

      <AuditSection
        title={isAuditor ? "Riwayat Audit — Hanya Dilihat" : "Audit"}
        audits={historyAudits}
        showAuditor={!isAuditor}
        emptyMessage={isAuditor ? "Belum ada audit terkirim." : "Belum ada audit."}
      />
    </div>
  );
}

type AuditListItem = {
  id: string;
  period: string;
  status: "DRAFT" | "SUBMITTED";
  area: { name: string };
  auditor: { name: string };
  _count: { findings: number };
};

function AuditSection({
  title,
  audits,
  showAuditor,
  emptyMessage,
}: {
  title: string;
  audits: AuditListItem[];
  showAuditor: boolean;
  emptyMessage: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {audits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <Card>
          <ul className="divide-y">
            {audits.map((audit) => (
              <li key={audit.id}>
                <Link
                  href={`/audit/${audit.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{audit.area.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPeriod(audit.period)} · {audit._count.findings}/21
                      temuan{showAuditor ? ` · ${audit.auditor.name}` : ""}
                    </p>
                  </div>
                  <AuditStatusBadge status={audit.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function AuditStatusBadge({ status }: { status: "DRAFT" | "SUBMITTED" }) {
  const map = {
    DRAFT: { label: "Draft · Bisa diisi", cls: "bg-warning/10 text-warning" },
    SUBMITTED: {
      label: "Terkirim · Terkunci",
      cls: "bg-success/10 text-success",
    },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
