// THE 5R scoring engine. Single source of truth — never inline this math elsewhere.
// Formula (from CLAUDE.md):
//   weights: Done = +2, Progress = +1, No Progress = -1, total weight = 2
//   finalScore = ((doneShare*2 + progressShare*1 + noProgressShare*(-1)) / 2) * 100
//   rounded to nearest integer.

export type ScoreInput = {
  done: number;
  progress: number;
  noProgress: number;
};

export type ScoreBreakdown = {
  countDone: number;
  countProgress: number;
  countNoProgress: number;
  countTotal: number;
  donePct: number;
  progressPct: number;
  noProgressPct: number;
  valueDone: number;
  valueProgress: number;
  valueNoProgress: number;
  finalScore: number; // integer
};

const WEIGHT_DONE = 2;
const WEIGHT_PROGRESS = 1;
const WEIGHT_NO_PROGRESS = -1;
const TOTAL_WEIGHT = 2;

export function calculate5RScore(input: ScoreInput): ScoreBreakdown {
  const countDone = Math.max(0, Math.trunc(input.done));
  const countProgress = Math.max(0, Math.trunc(input.progress));
  const countNoProgress = Math.max(0, Math.trunc(input.noProgress));
  const countTotal = countDone + countProgress + countNoProgress;

  if (countTotal === 0) {
    return {
      countDone,
      countProgress,
      countNoProgress,
      countTotal: 0,
      donePct: 0,
      progressPct: 0,
      noProgressPct: 0,
      valueDone: 0,
      valueProgress: 0,
      valueNoProgress: 0,
      finalScore: 0,
    };
  }

  const donePct = (countDone / countTotal) * 100;
  const progressPct = (countProgress / countTotal) * 100;
  const noProgressPct = (countNoProgress / countTotal) * 100;

  const valueDone = (donePct / 100) * WEIGHT_DONE;
  const valueProgress = (progressPct / 100) * WEIGHT_PROGRESS;
  const valueNoProgress = (noProgressPct / 100) * WEIGHT_NO_PROGRESS;

  const raw = ((valueDone + valueProgress + valueNoProgress) / TOTAL_WEIGHT) * 100;
  const finalScore = Math.round(raw);

  return {
    countDone,
    countProgress,
    countNoProgress,
    countTotal,
    donePct,
    progressPct,
    noProgressPct,
    valueDone,
    valueProgress,
    valueNoProgress,
    finalScore,
  };
}

// Grade band for a final score (Bahasa Indonesia label + semantic tone).
export type GradeTone = "success" | "info" | "warning" | "danger";
export type Grade = { label: string; tone: GradeTone };

export function gradeFor(score: number): Grade {
  if (score >= 90) return { label: "Sangat Baik", tone: "success" };
  if (score >= 75) return { label: "Baik", tone: "info" };
  if (score >= 60) return { label: "Cukup", tone: "warning" };
  return { label: "Perlu Perbaikan", tone: "danger" };
}
