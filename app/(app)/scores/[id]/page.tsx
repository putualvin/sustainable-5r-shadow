import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/rbac";
import { calculate5RScore, gradeFor } from "@/lib/scoring";
import { formatPeriod } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CapaPie, ScoreTrend } from "@/components/shared/score-charts";
import { PrintButton } from "@/components/shared/print-button";

export default async function ScoreDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "scores")) redirect("/403");

  const area = await db.area.findUnique({ where: { id: params.id } });
  if (!area) notFound();

  const scores = await db.score.findMany({
    where: { areaId: area.id },
    orderBy: { period: "asc" },
  });
  const latest = scores[scores.length - 1];

  if (!latest) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink />
        <h1 className="text-2xl font-bold">{area.name}</h1>
        <p className="text-sm text-muted-foreground">Belum ada data skor.</p>
      </div>
    );
  }

  const breakdown = calculate5RScore({
    done: latest.countDone,
    progress: latest.countProgress,
    noProgress: latest.countNoProgress,
  });
  const grade = gradeFor(latest.finalScore);

  const pieData = [
    { name: "Selesai", value: latest.countDone },
    { name: "Proses", value: latest.countProgress },
    { name: "Belum", value: latest.countNoProgress },
  ];
  const trendData = scores.map((s) => ({
    period: formatPeriod(s.period),
    score: s.finalScore,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <BackLink />
        <PrintButton />
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{area.name}</h1>
        <p className="text-sm text-muted-foreground">
          Periode {formatPeriod(latest.period)}
        </p>
      </div>

      {/* Skor besar */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Skor Akhir 5R</p>
            <p className="text-5xl font-bold tabular-nums text-primary">
              {latest.finalScore}%
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {grade.label}
          </span>
        </CardContent>
      </Card>

      {/* Breakdown perhitungan */}
      <Card>
        <CardHeader>
          <CardTitle>Rincian Perhitungan</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Jumlah</th>
                <th className="py-2 text-right font-medium">%</th>
                <th className="py-2 text-right font-medium">Bobot</th>
                <th className="py-2 text-right font-medium">Nilai</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <Row label="Selesai (Done)" count={breakdown.countDone} pct={breakdown.donePct} weight="+2" value={breakdown.valueDone} />
              <Row label="Proses (Progress)" count={breakdown.countProgress} pct={breakdown.progressPct} weight="+1" value={breakdown.valueProgress} />
              <Row label="Belum (No Progress)" count={breakdown.countNoProgress} pct={breakdown.noProgressPct} weight="-1" value={breakdown.valueNoProgress} />
              <tr className="border-t font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{breakdown.countTotal}</td>
                <td className="py-2 text-right">100%</td>
                <td className="py-2 text-right">/2</td>
                <td className="py-2 text-right">{latest.finalScore}%</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Skor = ((nilai Done + nilai Progress + nilai No Progress) / 2) × 100,
            dibulatkan.
          </p>
        </CardContent>
      </Card>

      {/* Grafik */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Komposisi CAPA</CardTitle>
          </CardHeader>
          <CardContent>
            <CapaPie data={pieData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tren Skor</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrend data={trendData} />
          </CardContent>
        </Card>
      </div>

      {/* Blok tanda tangan (cetak) */}
      <Card>
        <CardHeader>
          <CardTitle>Pengesahan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 pt-4 text-center text-sm">
            {["Auditor", "PIC Area", "Komite Unit"].map((role) => (
              <div key={role}>
                <div className="mb-12 text-muted-foreground">{role}</div>
                <div className="border-t pt-1">( ______________ )</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/scores"
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground print:hidden"
    >
      <ChevronLeft className="h-4 w-4" /> Kembali
    </Link>
  );
}

function Row({
  label,
  count,
  pct,
  weight,
  value,
}: {
  label: string;
  count: number;
  pct: number;
  weight: string;
  value: number;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-2">{label}</td>
      <td className="py-2 text-right">{count}</td>
      <td className="py-2 text-right">{pct.toFixed(1)}%</td>
      <td className="py-2 text-right">{weight}</td>
      <td className="py-2 text-right">{value.toFixed(3)}</td>
    </tr>
  );
}
