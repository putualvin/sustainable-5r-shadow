import Link from "next/link";
import {
  Gauge,
  ListChecks,
  Wrench,
  Tag,
  ChartColumn,
  ClipboardCheck,
  ChevronRight,
  ArrowRight,
  Clock,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, hasAnyRole, rolesLabel } from "@/lib/rbac";
import { gradeFor } from "@/lib/scoring";
import { formatPeriod, formatDate } from "@/lib/format";
import { PILLAR_LABEL } from "@/lib/pillars";
import { urgency } from "@/lib/redtag";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Tone = "success" | "info" | "warning" | "danger" | "neutral";
const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-foreground",
};
const TONE_BG: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-muted text-muted-foreground",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const roles = user.roles;
  const period = currentPeriod();

  const isKomite = hasAnyRole(roles, "komite_unit", "admin");
  const isAuditor = roles.includes("auditor");
  const isAuditee = roles.includes("auditee");
  const isRedTag = roles.includes("kord_red_tag");
  const isManagement = roles.includes("management");

  // ---- KPI (role-aware) ----
  const latest = await db.score.findFirst({ orderBy: { period: "desc" } });
  const scorePeriod = latest?.period ?? null;
  const [scores, openCapa, activeRedTags, checklistRuns] = await Promise.all([
    scorePeriod ? db.score.findMany({ where: { period: scorePeriod } }) : Promise.resolve([]),
    db.finding.count({
      where: { status: "PENDING_CAPA", OR: [{ capa: null }, { capa: { status: { not: "DONE" } } }] },
    }),
    db.redTag.count({ where: { status: "OPEN" } }),
    scorePeriod
      ? db.checklistRun.findMany({
          where: { createdAt: { gte: new Date(`${scorePeriod}-01`) } },
          select: { score: true },
        })
      : Promise.resolve([]),
  ]);
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((s, x) => s + x.finalScore, 0) / scores.length) : 0;
  const grade = gradeFor(avgScore);
  const checklistAvg =
    checklistRuns.length > 0
      ? Math.round(checklistRuns.reduce((s, r) => s + r.score, 0) / checklistRuns.length)
      : null;

  const kpis: { section: string; label: string; value: string; caption: string; icon: typeof Gauge; tone: Tone }[] = [];
  if (canAccess(roles, "scores"))
    kpis.push({ section: "scores", label: "Skor 5R", value: scores.length ? `${avgScore}%` : "—", caption: scores.length ? `${grade.label} · rata-rata` : "Belum ada data", icon: Gauge, tone: scores.length ? grade.tone : "neutral" });
  if (canAccess(roles, "capa"))
    kpis.push({ section: "capa", label: "CAPA Terbuka", value: `${openCapa}`, caption: openCapa ? "perlu tindak lanjut" : "semua tertutup", icon: Wrench, tone: openCapa ? "warning" : "success" });
  if (canAccess(roles, "checklist"))
    kpis.push({ section: "checklist", label: "Checklist", value: checklistAvg !== null ? `${checklistAvg}%` : "—", caption: checklistAvg !== null ? "rata-rata bulan ini" : "belum ada pengisian", icon: ListChecks, tone: checklistAvg === null ? "neutral" : checklistAvg >= 90 ? "success" : "warning" });
  if (canAccess(roles, "redtag"))
    kpis.push({ section: "redtag", label: "Red Tag Aktif", value: `${activeRedTags}`, caption: activeRedTags ? "menunggu keputusan" : "tidak ada", icon: Tag, tone: activeRedTags ? "info" : "success" });

  // ---- Role-specific work queues ----
  const [
    komiteQueue,
    auditeeFindings,
    checklistTodayRun,
    redTagQueue,
    auditorSchedules,
    auditorAudits,
    mgmtScores,
  ] = await Promise.all([
    isKomite
      ? db.finding.findMany({
          where: { capa: { is: { status: null } }, audit: { status: "SUBMITTED" } },
          include: { guidingQuestion: true, audit: { include: { area: true } } },
          orderBy: { createdAt: "asc" },
          take: 6,
        })
      : Promise.resolve([]),
    isAuditee && user.areaId
      ? db.finding.findMany({
          where: { capa: null, status: "PENDING_CAPA", audit: { areaId: user.areaId } },
          include: { guidingQuestion: true },
          orderBy: { createdAt: "asc" },
          take: 6,
        })
      : Promise.resolve([]),
    isAuditee && user.areaId
      ? db.checklistRun.findFirst({ where: { areaId: user.areaId, date: todayStr() } })
      : Promise.resolve(null),
    isRedTag || isAuditee
      ? db.redTag.findMany({ where: { status: "OPEN" }, include: { area: true }, orderBy: { dueDate: "asc" }, take: 6 })
      : Promise.resolve([]),
    isAuditor
      ? db.auditSchedule.findMany({ where: { auditorId: user.id, period }, include: { area: true } })
      : Promise.resolve([]),
    isAuditor
      ? db.audit.findMany({ where: { auditorId: user.id, period }, include: { area: true } })
      : Promise.resolve([]),
    isManagement && scorePeriod
      ? db.score.findMany({ where: { period: scorePeriod }, include: { area: true }, orderBy: { finalScore: "asc" } })
      : Promise.resolve([]),
  ]);

  const startedSchedules = new Set(auditorAudits.map((a) => a.scheduleId).filter(Boolean));
  const pendingSchedules = auditorSchedules.filter((s) => !startedSchedules.has(s.id));
  const draftAudits = auditorAudits.filter((a) => a.status === "DRAFT");

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Selamat datang, {user.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {rolesLabel(roles)} · Periode {formatPeriod(period)}
        </p>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Link key={k.section} href={`/${k.section}`} className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <Icon className={cn("h-5 w-5", TONE_TEXT[k.tone])} />
                </div>
                <p className={cn("mt-2 text-3xl font-bold tabular-nums", TONE_TEXT[k.tone])}>{k.value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{k.caption}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* ===== Antrean kerja per peran ===== */}

      {/* Komite: antrean penilaian CAPA */}
      {isKomite && (
        <Queue
          icon={ShieldCheck}
          tone="info"
          title="Antrean Penilaian CAPA"
          subtitle="CAPA menunggu verifikasi & penetapan status"
          href="/capa"
          count={komiteQueue.length}
          empty="Tidak ada CAPA yang menunggu verifikasi."
        >
          {komiteQueue.map((f) => (
            <Row key={f.id} href={`/capa/${f.id}`} title={f.guidingQuestion.subCategory} sub={f.audit.area.name} badge={<Pending />} />
          ))}
        </Queue>
      )}

      {/* Auditor: penugasan audit */}
      {isAuditor && (
        <Queue
          icon={ClipboardCheck}
          tone="warning"
          title="Penugasan Audit"
          subtitle="Jadwal audit Anda periode ini"
          href="/audit"
          count={pendingSchedules.length + draftAudits.length}
          empty="Tidak ada penugasan audit aktif."
        >
          {draftAudits.map((a) => (
            <Row key={`d-${a.id}`} href={`/audit/${a.id}`} title={a.area.name} sub="Draft — lanjutkan" badge={<Tag2 cls="bg-warning/10 text-warning">Draft</Tag2>} />
          ))}
          {pendingSchedules.map((s) => (
            <Row key={`s-${s.id}`} href="/audit" title={s.area.name} sub="Belum dimulai" badge={<Tag2 cls="bg-muted text-muted-foreground">Mulai</Tag2>} />
          ))}
        </Queue>
      )}

      {/* Auditee: tindak lanjut + checklist hari ini */}
      {isAuditee && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Queue
            icon={Wrench}
            tone="warning"
            title="Temuan Perlu Tindak Lanjut"
            subtitle="Isi akar masalah, korektif, preventif"
            href="/capa"
            count={auditeeFindings.length}
            empty="Tidak ada temuan yang menunggu CAPA."
          >
            {auditeeFindings.map((f) => (
              <Row key={f.id} href={`/capa/${f.id}`} title={f.guidingQuestion.subCategory} sub={PILLAR_LABEL[f.guidingQuestion.pillar]} />
            ))}
          </Queue>

          <Link href="/checklist" className="block">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_BG[checklistTodayRun ? "success" : "warning"])}>
                      <ListChecks className="h-4 w-4" />
                    </span>
                    Checklist Hari Ini
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                {checklistTodayRun ? (
                  <p className="text-sm">
                    Sudah diisi ·{" "}
                    <span className={cn("font-bold tabular-nums", checklistTodayRun.score >= 90 ? "text-success" : "text-danger")}>
                      {checklistTodayRun.score}%
                    </span>
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-warning">
                    <Clock className="h-4 w-4" /> Belum diisi hari ini
                  </p>
                )}
                <p className="mt-auto text-xs text-muted-foreground">{formatDate(new Date())}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Koordinator Red Tag */}
      {isRedTag && (
        <Queue
          icon={Tag}
          tone="info"
          title="Red Tag Perlu Keputusan"
          subtitle="Item terbuka, urut paling mendesak"
          href="/redtag"
          count={redTagQueue.length}
          empty="Tidak ada red tag yang menunggu keputusan."
        >
          {redTagQueue.map((rt) => {
            const u = urgency(rt.dueDate, rt.status);
            return (
              <Row key={rt.id} href={`/redtag/${rt.id}`} title={rt.name} sub={`${rt.area.name} · jatuh tempo ${formatDate(rt.dueDate)}`} badge={<Tag2 cls={u.cls}>{u.label}</Tag2>} />
            );
          })}
        </Queue>
      )}

      {/* Management: ringkasan skor */}
      {isManagement && mgmtScores.length > 0 && (
        <Queue
          icon={ChartColumn}
          tone="info"
          title="Area Perlu Perhatian"
          subtitle="Skor 5R terendah periode ini"
          href="/scores"
          count={mgmtScores.filter((s) => s.finalScore < 75).length}
          empty="Semua area di atas ambang."
        >
          {mgmtScores.slice(0, 5).map((s) => {
            const g = gradeFor(s.finalScore);
            return (
              <Row key={s.id} href={`/scores/${s.areaId}`} title={s.area.name} sub={g.label} badge={<span className={cn("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", TONE_BG[g.tone])}>{s.finalScore}%</span>} />
            );
          })}
        </Queue>
      )}
    </div>
  );
}

function Queue({
  icon: Icon,
  tone,
  title,
  subtitle,
  href,
  count,
  empty,
  children,
}: {
  icon: typeof Gauge;
  tone: Tone;
  title: string;
  subtitle: string;
  href: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_BG[tone])}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight">
              {title}
              {count > 0 && <span className="ml-2 text-sm font-bold tabular-nums text-primary">{count}</span>}
            </h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Link href={href} className="shrink-0 text-xs font-medium text-primary hover:underline">
          Lihat semua
        </Link>
      </div>
      <Card>
        {count === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </Card>
    </section>
  );
}

function Row({
  href,
  title,
  sub,
  badge,
}: {
  href: string;
  title: string;
  sub: string;
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
        {badge}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function Pending() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
      <Clock className="h-3.5 w-3.5" /> Menunggu
    </span>
  );
}

function Tag2({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", cls)}>{children}</span>;
}
