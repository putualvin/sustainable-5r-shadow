import Link from "next/link";
import {
  ArrowRight,
  Gauge,
  ListChecks,
  Wrench,
  Tag,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { navForRole } from "@/lib/rbac";
import { gradeFor } from "@/lib/scoring";
import { formatPeriod } from "@/lib/format";
import { KpiCard } from "@/components/shared/kpi-card";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Real KPI: average 5R score for the latest period present in the DB.
  const latest = await db.score.findFirst({ orderBy: { period: "desc" } });
  const period = latest?.period ?? null;
  const [scores, openCapa, activeRedTags, checklistRuns] = await Promise.all([
    period ? db.score.findMany({ where: { period } }) : Promise.resolve([]),
    // Findings distributed to a PIC but not yet closed (no CAPA, or CAPA not Done).
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

  const quickLinks = navForRole(user.role).filter((n) => n.section !== "home");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Selamat datang,</p>
        <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
      </div>

      {/* KPI ringkas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Skor 5R Rata-rata"
          value={scores.length > 0 ? `${avgScore}%` : "—"}
          caption={
            scores.length > 0
              ? `${grade.label} · ${scores.length} area · ${formatPeriod(period)}`
              : "Belum ada data skor"
          }
          icon={Gauge}
          tone={scores.length > 0 ? grade.tone : "neutral"}
        />
        <KpiCard
          label="Checklist Harian"
          value={checklistAvg !== null ? `${checklistAvg}%` : "—"}
          caption={
            checklistAvg !== null
              ? `Rata-rata ${checklistRuns.length} pengisian bulan ini`
              : "Belum ada pengisian bulan ini"
          }
          icon={ListChecks}
          tone={
            checklistAvg === null
              ? "neutral"
              : checklistAvg >= 90
                ? "success"
                : "warning"
          }
        />
        <KpiCard
          label="CAPA Terbuka"
          value={`${openCapa}`}
          caption={openCapa > 0 ? "Temuan menunggu penutupan" : "Semua temuan tertutup"}
          icon={Wrench}
          tone={openCapa > 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Red Tag Aktif"
          value={`${activeRedTags}`}
          caption={activeRedTags > 0 ? "Menunggu keputusan koordinator" : "Tidak ada yang aktif"}
          icon={Tag}
          tone={activeRedTags > 0 ? "info" : "success"}
        />
      </div>

      {/* Akses cepat */}
      <div>
        <h2 className="mb-3 font-semibold">Menu Anda</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
