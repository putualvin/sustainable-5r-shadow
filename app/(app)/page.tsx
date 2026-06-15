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
import { KpiCard } from "@/components/shared/kpi-card";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Real KPI: average 5R score for the latest period present in the DB.
  const latest = await db.score.findFirst({ orderBy: { period: "desc" } });
  const period = latest?.period ?? null;
  const scores = period
    ? await db.score.findMany({ where: { period } })
    : [];

  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((s, x) => s + x.finalScore, 0) / scores.length)
      : 0;
  const grade = gradeFor(avgScore);

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
          value="—"
          caption="Segera (Module 4)"
          icon={ListChecks}
          tone="neutral"
        />
        <KpiCard
          label="CAPA Terbuka"
          value="—"
          caption="Segera (Module 3)"
          icon={Wrench}
          tone="neutral"
        />
        <KpiCard
          label="Red Tag Aktif"
          value="—"
          caption="Segera (Module 5)"
          icon={Tag}
          tone="neutral"
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

// "2026-06" -> "Jun 2026" (lightweight; date-fns formatting used elsewhere).
function formatPeriod(period: string | null): string {
  if (!period) return "";
  const [y, m] = period.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const idx = Number(m) - 1;
  return `${months[idx] ?? m} ${y}`;
}
