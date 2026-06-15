import { describe, it, expect } from "vitest";
import { calculate5RScore, gradeFor } from "@/lib/scoring";

describe("calculate5RScore", () => {
  // The canonical worked example from CLAUDE.md — non-negotiable.
  it("computes 17 Done / 3 Progress / 1 No Progress (21 total) -> 86%", () => {
    const r = calculate5RScore({ done: 17, progress: 3, noProgress: 1 });
    expect(r.countTotal).toBe(21);
    expect(r.finalScore).toBe(86);
  });

  it("returns 100 when all findings are Done", () => {
    expect(calculate5RScore({ done: 10, progress: 0, noProgress: 0 }).finalScore).toBe(100);
  });

  it("returns 50 when all findings are Progress", () => {
    expect(calculate5RScore({ done: 0, progress: 5, noProgress: 0 }).finalScore).toBe(50);
  });

  it("returns -50 when all findings are No Progress", () => {
    expect(calculate5RScore({ done: 0, progress: 0, noProgress: 5 }).finalScore).toBe(-50);
  });

  it("returns 0 for an empty set (no division by zero)", () => {
    const r = calculate5RScore({ done: 0, progress: 0, noProgress: 0 });
    expect(r.countTotal).toBe(0);
    expect(r.finalScore).toBe(0);
  });

  it("guards against negative inputs", () => {
    const r = calculate5RScore({ done: -5, progress: 0, noProgress: 0 });
    expect(r.countDone).toBe(0);
    expect(r.finalScore).toBe(0);
  });

  it("exposes a correct breakdown for the worked example", () => {
    const r = calculate5RScore({ done: 17, progress: 3, noProgress: 1 });
    expect(r.donePct).toBeCloseTo(80.95, 1);
    expect(r.progressPct).toBeCloseTo(14.29, 1);
    expect(r.noProgressPct).toBeCloseTo(4.76, 1);
  });
});

describe("gradeFor", () => {
  it("maps scores to Bahasa Indonesia grade bands", () => {
    expect(gradeFor(95).label).toBe("Sangat Baik");
    expect(gradeFor(80).label).toBe("Baik");
    expect(gradeFor(65).label).toBe("Cukup");
    expect(gradeFor(40).label).toBe("Perlu Perbaikan");
  });

  it("uses inclusive lower bounds at band edges", () => {
    expect(gradeFor(90).tone).toBe("success");
    expect(gradeFor(75).tone).toBe("info");
    expect(gradeFor(60).tone).toBe("warning");
    expect(gradeFor(59).tone).toBe("danger");
  });
});
