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

// ===== Lapis 2 — Score Akhir Sustainable 5R (CLAUDE.md §5.4) =====
//   Score Akhir = Nilai Utama − Temuan Berulang − Parking Lot
// - Temuan Berulang: −1 poin per temuan berulang.
// - Parking Lot: kumpulan temuan Not Done (Progress/No Progress). Untuk shadow
//   build, bobot pengurang Parking Lot = 0 (hanya dilacak; penalti Not Done sudah
//   tercermin di Nilai Utama). Lihat docs/decisions.md.
export type FinalScoreInput = ScoreInput & { recurring?: number };

export type FinalScore = {
  nilaiUtama: number; // Lapis 1 (integer %)
  temuanBerulang: number; // jumlah temuan berulang (−1 poin masing-masing)
  parkingLot: number; // jumlah temuan Not Done (tracking; pengurang 0)
  scoreAkhir: number; // Lapis 2 (integer %, di-clamp 0..100)
};

const PARKING_LOT_WEIGHT = 0; // tracking only — see §5.4 decision

export function calculateFinalScore(input: FinalScoreInput): FinalScore {
  const base = calculate5RScore(input);
  const nilaiUtama = base.finalScore;
  const temuanBerulang = Math.max(0, Math.trunc(input.recurring ?? 0));
  const parkingLot = base.countProgress + base.countNoProgress;
  const scoreAkhir = Math.max(
    0,
    Math.min(100, nilaiUtama - temuanBerulang - PARKING_LOT_WEIGHT * parkingLot)
  );
  return { nilaiUtama, temuanBerulang, parkingLot, scoreAkhir };
}

// ===== Scoring Auditor (§5.5) — 4 komponen @25% =====
export const FINDING_TARGET = 21;

export type AuditorScoreInput = {
  onTime: boolean; // audit dikirim ≤ tgl 10
  findingsCount: number;
  low: number; // jumlah temuan kategori Low
  high: number; // jumlah temuan kategori High
  isOwnArea: boolean; // auditor adalah PIC area yang diaudit (konflik)
  target?: number;
};

export type AuditorScore = {
  timeliness: number; // ketepatan waktu (0/100)
  achievement: number; // pencapaian target temuan (0..100)
  quality: number; // kualitas temuan (Low=1, High=2 → 0..100)
  independence: number; // bukan auditor area (0/100)
  total: number; // rata-rata 4 komponen (integer)
};

export function calculateAuditorScore(i: AuditorScoreInput): AuditorScore {
  const target = i.target ?? FINDING_TARGET;
  const timeliness = i.onTime ? 100 : 0;
  const achievement =
    target > 0 ? Math.min(100, Math.round((i.findingsCount / target) * 100)) : 0;
  const counted = i.low + i.high;
  // Low=1, High=2; maksimum per temuan = 2 → kualitas 100% bila semua High.
  const quality =
    counted > 0 ? Math.round(((i.low + i.high * 2) / (counted * 2)) * 100) : 0;
  const independence = i.isOwnArea ? 0 : 100;
  const total = Math.round(
    (timeliness + achievement + quality + independence) / 4
  );
  return { timeliness, achievement, quality, independence, total };
}
