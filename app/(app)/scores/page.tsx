import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeFor, type GradeTone } from "@/lib/scoring";
import { formatPeriod } from "@/lib/format";
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
    </div>
  );
}
