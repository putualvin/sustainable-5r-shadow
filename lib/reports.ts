// Pure aggregation helpers for the Monthly Report (Module 6).
// No DB access here — callers fetch rows, these transform them. Keeps the
// report page thin and the math unit-testable.

import type { Pillar } from "@prisma/client";
import { PILLARS } from "@/lib/pillars";

export type ScoreLike = {
  finalScore: number;
  countDone: number;
  countProgress: number;
  countNoProgress: number;
};

// Average final score across areas, rounded. 0 when empty.
export function averageScore(scores: { finalScore: number }[]): number {
  if (scores.length === 0) return 0;
  return Math.round(
    scores.reduce((s, x) => s + x.finalScore, 0) / scores.length
  );
}

// Sum the CAPA status tallies across areas (drives the compliance donut).
export function totalCapaStatuses(scores: ScoreLike[]): {
  done: number;
  progress: number;
  noProgress: number;
} {
  return scores.reduce(
    (acc, s) => ({
      done: acc.done + s.countDone,
      progress: acc.progress + s.countProgress,
      noProgress: acc.noProgress + s.countNoProgress,
    }),
    { done: 0, progress: 0, noProgress: 0 }
  );
}

// Count findings per pillar, in canonical 5R order (for the category bar).
export function findingsByPillar(
  findings: { guidingQuestion: { pillar: Pillar } }[]
): { name: string; value: number }[] {
  const counts = new Map<Pillar, number>();
  for (const f of findings) {
    const p = f.guidingQuestion.pillar;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return PILLARS.map((p) => ({ name: p.label, value: counts.get(p.key) ?? 0 }));
}

// Sub-categories that appear more than once — "recurring" findings panel.
export function recurringFindings(
  findings: { guidingQuestion: { subCategory: string; pillar: Pillar } }[]
): { subCategory: string; pillar: Pillar; count: number }[] {
  const counts = new Map<string, { pillar: Pillar; count: number }>();
  for (const f of findings) {
    const key = f.guidingQuestion.subCategory;
    const prev = counts.get(key);
    counts.set(key, {
      pillar: f.guidingQuestion.pillar,
      count: (prev?.count ?? 0) + 1,
    });
  }
  return Array.from(counts.entries())
    .filter(([, v]) => v.count > 1)
    .map(([subCategory, v]) => ({ subCategory, pillar: v.pillar, count: v.count }))
    .sort((a, b) => b.count - a.count);
}
