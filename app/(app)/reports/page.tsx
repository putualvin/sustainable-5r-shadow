import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { findingsByPillar } from "@/lib/reports";
import { PILLARS } from "@/lib/pillars";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PrintButton } from "@/components/shared/print-button";
import { ScoreTrend, CapaPie } from "@/components/shared/score-charts";
import { PillarPie, AreaScoreBar } from "@/components/shared/report-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const THRESHOLD = 75;

function avg2(rows: { finalScore: number }[]): number {
  if (rows.length === 0) return 0;
  return Math.round((rows.reduce((s, x) => s + x.finalScore, 0) / rows.length) * 100) / 100;
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const periodRows = await db.score.findMany({
    distinct: ["period"],
    select: { period: true },
    orderBy: { period: "asc" },
  });
  const periods = periodRows.map((p) => p.period);
  const period = periods.at(-1) ?? null;
  const prevPeriod = periods.at(-2) ?? null;

  if (!period) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold tracking-tight">Laporan Bulanan 5R</h1>
        <p className="mt-6 text-sm text-muted-foreground">Belum ada data untuk dilaporkan.</p>
      </div>
    );
  }

  const [scores, prevScores, allScores, findings] = await Promise.all([
    db.score.findMany({ where: { period }, include: { area: true }, orderBy: { finalScore: "desc" } }),
    prevPeriod ? db.score.findMany({ where: { period: prevPeriod } }) : Promise.resolve([]),
    db.score.findMany({ select: { period: true, finalScore: true } }),
    db.finding.findMany({
      where: { audit: { period, status: "SUBMITTED" } },
      include: { guidingQuestion: { select: { pillar: true } } },
    }),
  ]);

  // KPI summary
  const scoreCurr = avg2(scores);
  const scorePrev = prevScores.length ? avg2(prevScores) : null;
  const trend = scorePrev === null ? null : Math.round((scoreCurr - scorePrev) * 100) / 100;
  const recurringCurr = scores.reduce((s, x) => s + x.temuanBerulang, 0);
  const recurringPrev = prevScores.reduce((s, x) => s + x.temuanBerulang, 0);
  const done = scores.reduce((s, x) => s + x.countDone, 0);
  const progress = scores.reduce((s, x) => s + x.countProgress, 0);
  const noProgress = scores.reduce((s, x) => s + x.countNoProgress, 0);
  const statusTotal = done + progress + noProgress;
  const doneRate = statusTotal ? Math.round((done / statusTotal) * 100) : 0;

  // Charts data
  const trendData = periods.map((p) => ({
    period: formatPeriod(p),
    score: avg2(allScores.filter((s) => s.period === p)),
  }));
  const pillarData = findingsByPillar(findings); // [{name,value}] in 5R order
  const findingsTotal = pillarData.reduce((s, d) => s + d.value, 0);
  const topPillar = [...pillarData].sort((a, b) => b.value - a.value)[0];
  const statusData = [
    { name: "Done", value: done },
    { name: "Progress", value: progress },
    { name: "No Progress", value: noProgress },
  ];
  const areaBar = [...scores]
    .sort((a, b) => a.area.name.localeCompare(b.area.name))
    .map((s) => ({ name: s.area.name, score: s.finalScore }));
  const recurringAreas = scores
    .filter((s) => s.temuanBerulang > 0)
    .sort((a, b) => b.temuanBerulang - a.temuanBerulang)
    .map((s) => ({ name: s.area.name, count: s.temuanBerulang }));
  const belowThreshold = scores.filter((s) => s.finalScore < THRESHOLD);

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sustainable 5R — Dashboard Laporan</h1>
          <p className="text-sm text-muted-foreground">Periode {formatPeriod(period)} · Unit Refinery 2</p>
        </div>
        <PrintButton />
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={`Score ${formatPeriod(prevPeriod)}`} value={scorePrev !== null ? scorePrev.toFixed(2) : "—"} tone="neutral" />
        <Stat label={`Score ${formatPeriod(period)}`} value={scoreCurr.toFixed(2)} tone="success" />
        <Stat
          label="Trend (vs lalu)"
          value={trend === null ? "—" : `${trend >= 0 ? "+" : ""}${trend.toFixed(2)}`}
          tone={trend === null ? "neutral" : trend >= 0 ? "success" : "danger"}
          icon={trend === null ? undefined : trend >= 0 ? "up" : "down"}
        />
        <Stat label="Temuan Berulang" value={`${recurringCurr}`} suffix="kasus" tone={recurringCurr > 0 ? "danger" : "success"} />
        <Stat label="Done Rate" value={`${doneRate}%`} tone={doneRate >= 90 ? "success" : "warning"} />
        <Stat label="Area Diaudit" value={`${scores.length}`} suffix="area" tone="info" />
      </div>

      {/* Ringkasan naratif */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {trend !== null && (
              <li>
                Skor 5R periode {formatPeriod(period)} {trend >= 0 ? "meningkat" : "menurun"}{" "}
                {Math.abs(trend).toFixed(2)} poin dari bulan sebelumnya ({scoreCurr.toFixed(2)}).
              </li>
            )}
            <li>Done rate {doneRate}% — {done} dari {statusTotal} temuan dinilai tuntas.</li>
            <li>
              Terdapat {recurringCurr} kasus temuan berulang
              {recurringPrev ? ` (dari ${recurringPrev} kasus bulan lalu)` : ""}.
            </li>
            {topPillar && findingsTotal > 0 && (
              <li>Aspek {topPillar.name} menjadi temuan terbanyak ({topPillar.value} temuan).</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* #1 Tren score */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">1. Tren Score 5R (YTD)</CardTitle></CardHeader>
          <CardContent><ScoreTrend data={trendData} /></CardContent>
        </Card>
        {/* #3 Status temuan */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">3. Status Temuan</CardTitle></CardHeader>
          <CardContent>
            <CapaPie data={statusData} />
            <p className="mt-1 text-center text-xs text-muted-foreground">Done {doneRate}% · total {statusTotal}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* #2 Temuan per Level R */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">2. Temuan per Level R</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <PillarPie data={pillarData} />
            <table className="self-center text-sm">
              <tbody>
                {PILLARS.map((p, i) => (
                  <tr key={p.key} className="border-b last:border-0">
                    <td className="py-1.5 pr-3">{p.label}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{pillarData[i]?.value ?? 0}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-1.5 pr-3">Total</td>
                  <td className="py-1.5 text-right tabular-nums">{findingsTotal}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* #5 Temuan berulang */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">5. Temuan Berulang</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recurringAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada temuan berulang periode ini.</p>
            ) : (
              <ul className="space-y-1.5">
                {recurringAreas.map((r) => (
                  <li key={r.name} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{r.name}</span>
                    <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger tabular-nums">
                      {r.count} temuan
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {prevPeriod && (
              <div className="flex items-center justify-center gap-3 border-t pt-3 text-sm">
                <span className="rounded-md bg-danger/10 px-3 py-1.5 font-bold text-danger tabular-nums">{recurringPrev}</span>
                <ArrowRight className="h-4 w-4 text-success" />
                <span className="rounded-md bg-success/10 px-3 py-1.5 font-bold text-success tabular-nums">{recurringCurr}</span>
                <span className="text-xs text-muted-foreground">{formatPeriod(prevPeriod)} → {formatPeriod(period)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* #4 Score per area */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">4. Score per Area</CardTitle></CardHeader>
        <CardContent><AreaScoreBar data={areaBar} /></CardContent>
      </Card>

      {/* #6 Analisa & rekomendasi */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">6. Analisa &amp; Rekomendasi</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              {belowThreshold.length === 0
                ? "Seluruh area berada di atas ambang batas — pertahankan konsistensi budaya 5R."
                : `${belowThreshold.length} area di bawah ${THRESHOLD}% (${belowThreshold.map((s) => s.area.name).join(", ")}) perlu perhatian.`}
            </li>
            {recurringCurr > 0 && (
              <li>Pastikan preventive action menutup {recurringCurr} temuan berulang agar tidak terulang bulan depan.</li>
            )}
            {topPillar && findingsTotal > 0 && (
              <li>Fokuskan perbaikan pada aspek {topPillar.name} (temuan terbanyak).</li>
            )}
            {trend !== null && trend < 0 && <li>Skor menurun {Math.abs(trend).toFixed(2)} poin — tinjau area dengan penurunan terbesar.</li>}
            <li>Jaga Done Rate ≥ 90% dan tutup Parking Lot (temuan Progress/No Progress) tepat waktu.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone: "success" | "danger" | "warning" | "info" | "neutral";
  icon?: "up" | "down";
}) {
  const toneText: Record<string, string> = {
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
    info: "text-info",
    neutral: "text-foreground",
  };
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 flex items-baseline gap-1 text-2xl font-bold tabular-nums", toneText[tone])}>
        {icon === "up" && <TrendingUp className="h-4 w-4" />}
        {icon === "down" && <TrendingDown className="h-4 w-4" />}
        {value}
        {suffix && <span className="text-xs font-medium text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
