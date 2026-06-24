import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeFor, calculateAuditorScore, type GradeTone } from "@/lib/scoring";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const TONE_BADGE: Record<GradeTone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};
const TONE_TEXT: Record<GradeTone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
};

export default async function ScoresPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const latest = await db.score.findFirst({ orderBy: { period: "desc" } });
  const period = latest?.period ?? null;
  const scores = period
    ? await db.score.findMany({
        where: { period },
        include: { area: true },
        orderBy: { finalScore: "desc" },
      })
    : [];

  const avg =
    scores.length > 0
      ? Math.round(scores.reduce((s, x) => s + x.finalScore, 0) / scores.length)
      : 0;
  const avgGrade = gradeFor(avg);

  // Skor Auditor (§5.5) — per submitted audit, averaged per auditor.
  const auditsForScore = period
    ? await db.audit.findMany({
        where: { period, status: "SUBMITTED" },
        include: {
          auditor: { select: { id: true, name: true, areaId: true } },
          findings: { select: { kategori: true } },
        },
      })
    : [];

  const byAuditor = new Map<
    string,
    { name: string; audits: number; sum: number; t: number; a: number; q: number; ind: number }
  >();
  for (const au of auditsForScore) {
    const high = au.findings.filter((f) => f.kategori === "HIGH").length;
    const low = au.findings.length - high;
    const onTime = au.submittedAt ? new Date(au.submittedAt).getDate() <= 10 : false;
    const sc = calculateAuditorScore({
      onTime,
      findingsCount: au.findings.length,
      low,
      high,
      isOwnArea: au.auditor.areaId === au.areaId,
    });
    const cur = byAuditor.get(au.auditor.id) ?? {
      name: au.auditor.name,
      audits: 0,
      sum: 0,
      t: 0,
      a: 0,
      q: 0,
      ind: 0,
    };
    cur.audits += 1;
    cur.sum += sc.total;
    cur.t += sc.timeliness;
    cur.a += sc.achievement;
    cur.q += sc.quality;
    cur.ind += sc.independence;
    byAuditor.set(au.auditor.id, cur);
  }
  const auditorRows = Array.from(byAuditor.values())
    .map((v) => ({
      name: v.name,
      audits: v.audits,
      score: Math.round(v.sum / v.audits),
      t: Math.round(v.t / v.audits),
      a: Math.round(v.a / v.audits),
      q: Math.round(v.q / v.audits),
      ind: Math.round(v.ind / v.audits),
    }))
    .sort((x, y) => y.score - x.score);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skor 5R</h1>
          <p className="text-sm text-muted-foreground">
            Periode {formatPeriod(period)} · {scores.length} area
          </p>
        </div>
        {scores.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Rata-rata</p>
            <p className={`text-3xl font-bold tabular-nums ${TONE_TEXT[avgGrade.tone]}`}>
              {avg}%
            </p>
          </div>
        )}
      </div>

      {scores.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data skor.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map((s) => {
            const g = gradeFor(s.finalScore);
            return (
              <Link key={s.id} href={`/scores/${s.areaId}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-medium">{s.area.name}</p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                      <span
                        className={`text-3xl font-bold tabular-nums ${TONE_TEXT[g.tone]}`}
                      >
                        {s.finalScore}%
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_BADGE[g.tone]}`}
                      >
                        {g.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Skor Auditor (§5.5) */}
      {auditorRows.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Skor Auditor</h2>
            <p className="text-xs text-muted-foreground">
              4 komponen @25%: ketepatan waktu, pencapaian target, kualitas
              temuan, independensi.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {auditorRows.map((r) => {
              const g = gradeFor(r.score);
              return (
                <Card key={r.name}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.audits} audit
                        </p>
                      </div>
                      <span
                        className={`text-2xl font-bold tabular-nums ${TONE_TEXT[g.tone]}`}
                      >
                        {r.score}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <Comp label="Ketepatan Waktu" value={r.t} />
                      <Comp label="Target Temuan" value={r.a} />
                      <Comp label="Kualitas" value={r.q} />
                      <Comp label="Independensi" value={r.ind} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Comp({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 75 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-danger"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
