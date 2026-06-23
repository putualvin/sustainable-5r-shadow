import Link from "next/link";
import {
  Gauge,
  ListChecks,
  Wrench,
  Tag,
  ClipboardCheck,
  ChartColumn,
  CalendarDays,
  FileText,
  FolderOpen,
  Settings,
  Home,
  type LucideIcon,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { navForRoles, canAccess, rolesLabel, type Section } from "@/lib/rbac";
import { gradeFor } from "@/lib/scoring";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

const SECTION_ICON: Record<Section, LucideIcon> = {
  home: Home,
  audit: ClipboardCheck,
  capa: Wrench,
  checklist: ListChecks,
  redtag: Tag,
  scores: ChartColumn,
  schedule: CalendarDays,
  reports: FileText,
  documents: FolderOpen,
  admin: Settings,
};

const SECTION_DESC: Record<Section, string> = {
  home: "",
  audit: "Input temuan & jadwal",
  capa: "Tindak lanjut temuan",
  checklist: "Harian per shift",
  redtag: "Registrasi & disposal",
  scores: "Skor 5R per area",
  schedule: "Penugasan auditor",
  reports: "Laporan & tren",
  documents: "Panduan & SOP",
  admin: "Pengguna & log",
};

type Tone = "success" | "info" | "warning" | "danger" | "neutral";
const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-foreground",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const latest = await db.score.findFirst({ orderBy: { period: "desc" } });
  const period = latest?.period ?? null;
  const [scores, openCapa, activeRedTags, checklistRuns] = await Promise.all([
    period ? db.score.findMany({ where: { period } }) : Promise.resolve([]),
    db.finding.count({
      where: {
        status: "PENDING_CAPA",
        OR: [{ capa: null }, { capa: { status: { not: "DONE" } } }],
      },
    }),
    db.redTag.count({ where: { status: "OPEN" } }),
    period
      ? db.checklistRun.findMany({
          where: { createdAt: { gte: new Date(`${period}-01`) } },
          select: { score: true },
        })
      : Promise.resolve([]),
  ]);

  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((s, x) => s + x.finalScore, 0) / scores.length)
      : 0;
  const grade = gradeFor(avgScore);
  const checklistAvg =
    checklistRuns.length > 0
      ? Math.round(
          checklistRuns.reduce((s, r) => s + r.score, 0) / checklistRuns.length
        )
      : null;

  const can = (s: Section) => canAccess(user.roles, s);
  const quickLinks = navForRoles(user.roles).filter((n) => n.section !== "home");

  type Kpi = {
    section: Section;
    label: string;
    value: string;
    caption: string;
    icon: LucideIcon;
    tone: Tone;
  };
  const kpis: Kpi[] = [];
  if (can("scores"))
    kpis.push({
      section: "scores",
      label: "Skor 5R",
      value: scores.length > 0 ? `${avgScore}%` : "—",
      caption: scores.length > 0 ? `${grade.label} · rata-rata` : "Belum ada data",
      icon: Gauge,
      tone: scores.length > 0 ? grade.tone : "neutral",
    });
  if (can("capa"))
    kpis.push({
      section: "capa",
      label: "CAPA Terbuka",
      value: `${openCapa}`,
      caption: openCapa > 0 ? "perlu tindak lanjut" : "semua tertutup",
      icon: Wrench,
      tone: openCapa > 0 ? "warning" : "success",
    });
  if (can("checklist"))
    kpis.push({
      section: "checklist",
      label: "Checklist",
      value: checklistAvg !== null ? `${checklistAvg}%` : "—",
      caption: checklistAvg !== null ? "rata-rata bulan ini" : "belum ada pengisian",
      icon: ListChecks,
      tone: checklistAvg === null ? "neutral" : checklistAvg >= 90 ? "success" : "warning",
    });
  if (can("redtag"))
    kpis.push({
      section: "redtag",
      label: "Red Tag Aktif",
      value: `${activeRedTags}`,
      caption: activeRedTags > 0 ? "menunggu keputusan" : "tidak ada",
      icon: Tag,
      tone: activeRedTags > 0 ? "info" : "success",
    });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Selamat datang, {user.name}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {rolesLabel(user.roles)}
          {period ? ` · Periode ${formatPeriod(period)}` : ""}
        </p>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Link
                key={k.section}
                href={`/${k.section}`}
                className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {k.label}
                  </p>
                  <Icon className={cn("h-5 w-5", TONE_TEXT[k.tone])} />
                </div>
                <p className={cn("mt-2 text-3xl font-bold tabular-nums", TONE_TEXT[k.tone])}>
                  {k.value}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{k.caption}</p>
              </Link>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Modul</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = SECTION_ICON[link.section];
            return (
              <Link
                key={link.section}
                href={link.href}
                className="group flex flex-col items-center gap-3 rounded-2xl bg-muted p-5 text-center transition-colors hover:bg-muted/70"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold">{link.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {SECTION_DESC[link.section]}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
