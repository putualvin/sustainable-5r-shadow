import Link from "next/link";
import {
  ArrowRight,
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
import { navForRoles, canAccess, type Section } from "@/lib/rbac";
import { gradeFor } from "@/lib/scoring";
import { formatPeriod } from "@/lib/format";
import { KpiCard } from "@/components/shared/kpi-card";

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
  audit: "Input temuan & jadwal audit",
  capa: "Tindak lanjut & verifikasi temuan",
  checklist: "Pengecekan harian per shift",
  redtag: "Registrasi & disposal barang",
  scores: "Skor 5R per area",
  schedule: "Jadwal penugasan auditor",
  reports: "Laporan bulanan & tren",
  documents: "Panduan, SOP, formulir",
  admin: "Pengguna & log aktivitas",
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Real KPI: average 5R score for the latest period present in the DB.
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

  // KPI tiles (only shown when the role can open the target section).
  type Kpi = {
    section: Section;
    label: string;
    value: string;
    caption: string;
    icon: LucideIcon;
    tone: "success" | "info" | "warning" | "danger" | "neutral";
  };
  const kpis: Kpi[] = [];
  if (can("scores")) {
    kpis.push({
      section: "scores",
      label: "Skor 5R Rata-rata",
      value: scores.length > 0 ? `${avgScore}%` : "—",
      caption: scores.length > 0 ? `${grade.label} · ${formatPeriod(period)}` : "Belum ada data",
      icon: Gauge,
      tone: scores.length > 0 ? grade.tone : "neutral",
    });
  }
  if (can("capa")) {
    kpis.push({
      section: "capa",
      label: "CAPA Terbuka",
      value: `${openCapa}`,
      caption: openCapa > 0 ? "Perlu tindak lanjut" : "Semua tertutup",
      icon: Wrench,
      tone: openCapa > 0 ? "warning" : "success",
    });
  }
  if (can("checklist")) {
    kpis.push({
      section: "checklist",
      label: "Checklist Harian",
      value: checklistAvg !== null ? `${checklistAvg}%` : "—",
      caption: checklistAvg !== null ? `Rata-rata bulan ini` : "Belum ada pengisian",
      icon: ListChecks,
      tone: checklistAvg === null ? "neutral" : checklistAvg >= 90 ? "success" : "warning",
    });
  }
  if (can("redtag")) {
    kpis.push({
      section: "redtag",
      label: "Red Tag Aktif",
      value: `${activeRedTags}`,
      caption: activeRedTags > 0 ? "Menunggu keputusan" : "Tidak ada",
      icon: Tag,
      tone: activeRedTags > 0 ? "info" : "success",
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Selamat datang,</p>
        <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard
              key={k.section}
              label={k.label}
              value={k.value}
              caption={k.caption}
              icon={k.icon}
              tone={k.tone}
              href={`/${k.section}`}
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-semibold">Akses Cepat</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = SECTION_ICON[link.section];
            return (
              <Link
                key={link.section}
                href={link.href}
                className="group flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{link.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SECTION_DESC[link.section]}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
