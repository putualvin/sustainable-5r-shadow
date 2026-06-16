import {
  Gauge,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeFor, type GradeTone } from "@/lib/scoring";
import {
  averageScore,
  totalCapaStatuses,
  findingsByPillar,
  recurringFindings,
} from "@/lib/reports";
import { PILLAR_LABEL } from "@/lib/pillars";
import { formatPeriod } from "@/lib/format";
import { KpiCard } from "@/components/shared/kpi-card";
import { PrintButton } from "@/components/shared/print-button";
import { ScoreTrend, CapaPie } from "@/components/shared/score-charts";
import { CategoryBar } from "@/components/shared/report-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TONE_TEXT: Record<GradeTone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
};
const TONE_BADGE: Record<GradeTone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

const THRESHOLD = 75; // areas below this need attention

// Small inline delta indicator (vs previous period).
function Delta({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-xs text-muted-foreground">—</span>;
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${up ? "text-success" : "text-danger"}`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {value}
    </span>
  );
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Distinct periods that have score data, oldest → newest.
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
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold tracking-tight">Laporan Bulanan 5R</h1>
        <p className="mt-6 text-sm text-muted-foreground">
          Belum ada data skor untuk dilaporkan.
        </p>
      </div>
    );
  }

  const [scores, prevScores, allScores, findings, audits] = await Promise.all([
    db.score.findMany({
      where: { period },
      include: { area: true },
      orderBy: { finalScore: "desc" },
    }),
    prevPeriod
      ? db.score.findMany({ where: { period: prevPeriod } })
      : Promise.resolve([]),
    db.score.findMany({ select: { period: true, finalScore: true } }),
    db.finding.findMany({
      where: { audit: { period, status: "SUBMITTED" } },
      include: { guidingQuestion: true },
    }),
    db.audit.findMany({
      where: { period, status: "SUBMITTED" },
      include: { auditor: true, _count: { select: { findings: true } } },
    }),
  ]);

  const prevMap = new Map(prevScores.map((s) => [s.areaId, s.finalScore]));
  const avg = averageScore(scores);
  const prevAvg = prevScores.length ? averageScore(prevScores) : null;
  const avgDelta = prevAvg === null ? null : avg - prevAvg;
  const avgGrade = gradeFor(avg);

  const capa = totalCapaStatuses(scores);
  const capaTotal = capa.done + capa.progress + capa.noProgress;
  const completionPct = capaTotal
    ? Math.round((capa.done / capaTotal) * 100)
    : 0;
  const belowThreshold = scores.filter((s) => s.finalScore < THRESHOLD);

  // Trend: average score per period (oldest → newest).
  const trend = periods.map((p) => ({
    period: formatPeriod(p),
    score: averageScore(allScores.filter((s) => s.period === p)),
  }));

  const pillarData = findingsByPillar(findings);
  const recurring = recurringFindings(findings);
  const capaPie = [
    { name: "Selesai", value: capa.done },
    { name: "Proses", value: capa.progress },
    { name: "Belum", value: capa.noProgress },
  ];

  // Auditor activity ranking (submitted audits + findings logged).
  const auditorStats = new Map<
    string,
    { name: string; audits: number; findings: number }
  >();
  for (const a of audits) {
    const cur = auditorStats.get(a.auditorId) ?? {
      name: a.auditor.name,
      audits: 0,
      findings: 0,
    };
    cur.audits += 1;
    cur.findings += a._count.findings;
    auditorStats.set(a.auditorId, cur);
  }
  const auditorRanking = Array.from(auditorStats.values()).sort(
    (a, b) => b.audits - a.audits || b.findings - a.findings
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Bulanan 5R</h1>
          <p className="text-sm text-muted-foreground">
            Periode {formatPeriod(period)} · {scores.length} area · Unit Refinery 2
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Ringkasan eksekutif */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Skor 5R Rata-rata"
          value={`${avg}%`}
          caption={
            avgDelta === null
              ? avgGrade.label
              : `${avgGrade.label} · ${avgDelta >= 0 ? "+" : ""}${avgDelta} vs ${formatPeriod(prevPeriod)}`
          }
          icon={Gauge}
          tone={avgGrade.tone}
        />
        <KpiCard
          label="CAPA Selesai"
          value={`${completionPct}%`}
          caption={`${capa.done}/${capaTotal} temuan ditutup`}
          icon={CheckCircle2}
          tone={
            completionPct >= 75 ? "success" : completionPct >= 50 ? "warning" : "danger"
          }
        />
        <KpiCard
          label="Area Diaudit"
          value={`${scores.length}`}
          caption={`${audits.length} audit terkirim`}
          icon={ClipboardCheck}
          tone="info"
        />
        <KpiCard
          label="Area di Bawah 75%"
          value={`${belowThreshold.length}`}
          caption={belowThreshold.length ? "Perlu perhatian" : "Semua area baik"}
          icon={AlertTriangle}
          tone={belowThreshold.length ? "warning" : "success"}
        />
      </div>

      {/* Tren + komposisi CAPA */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Skor 5R</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrend data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Komposisi CAPA</CardTitle>
          </CardHeader>
          <CardContent>
            <CapaPie data={capaPie} />
          </CardContent>
        </Card>
      </div>

      {/* Tabel per area */}
      <Card>
        <CardHeader>
          <CardTitle>Skor per Area</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y text-left text-xs text-muted-foreground">
                  <th className="px-6 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Area</th>
                  <th className="px-3 py-2 text-right font-medium">Skor</th>
                  <th className="px-3 py-2 text-right font-medium">vs Lalu</th>
                  <th className="px-6 py-2 text-right font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => {
                  const g = gradeFor(s.finalScore);
                  const prev = prevMap.get(s.areaId);
                  const delta = prev === undefined ? null : s.finalScore - prev;
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-6 py-2 tabular-nums text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-medium">{s.area.name}</td>
                      <td
                        className={`px-3 py-2 text-right font-bold tabular-nums ${TONE_TEXT[g.tone]}`}
                      >
                        {s.finalScore}%
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Delta value={delta} />
                      </td>
                      <td className="px-6 py-2 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_BADGE[g.tone]}`}
                        >
                          {g.label}
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

      {/* Temuan per kategori + berulang */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Temuan per Kategori 5R</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBar data={pillarData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Temuan Berulang</CardTitle>
          </CardHeader>
          <CardContent>
            {recurring.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada sub-kategori temuan yang berulang.
              </p>
            ) : (
              <ul className="space-y-2">
                {recurring.map((r) => (
                  <li
                    key={r.subCategory}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.subCategory}</p>
                      <p className="text-xs text-muted-foreground">
                        {PILLAR_LABEL[r.pillar]}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning tabular-nums">
                      {r.count}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aktivitas auditor */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Auditor</CardTitle>
        </CardHeader>
        <CardContent>
          {auditorRanking.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada audit terkirim pada periode ini.
            </p>
          ) : (
            <ul className="divide-y">
              {auditorRanking.map((a, i) => (
                <li key={a.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                      {i + 1}
                    </span>
                    <span className="font-medium">{a.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {a.audits} audit · {a.findings} temuan
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
