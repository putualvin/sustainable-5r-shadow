import { describe, it, expect } from "vitest";
import {
  averageScore,
  totalCapaStatuses,
  findingsByPillar,
  recurringFindings,
} from "./reports";

describe("averageScore", () => {
  it("rounds the mean of final scores", () => {
    expect(averageScore([{ finalScore: 86 }, { finalScore: 75 }])).toBe(81); // 80.5 -> 81
  });
  it("returns 0 for no scores", () => {
    expect(averageScore([])).toBe(0);
  });
});

describe("totalCapaStatuses", () => {
  it("sums tallies across areas", () => {
    const totals = totalCapaStatuses([
      { finalScore: 0, countDone: 17, countProgress: 3, countNoProgress: 1 },
      { finalScore: 0, countDone: 20, countProgress: 2, countNoProgress: 0 },
    ]);
    expect(totals).toEqual({ done: 37, progress: 5, noProgress: 1 });
  });
});

describe("findingsByPillar", () => {
  it("counts per pillar in canonical 5R order, including zeros", () => {
    const result = findingsByPillar([
      { guidingQuestion: { pillar: "RESIK" } },
      { guidingQuestion: { pillar: "RESIK" } },
      { guidingQuestion: { pillar: "RINGKAS" } },
    ]);
    expect(result.map((r) => r.name)).toEqual([
      "Ringkas",
      "Rapi",
      "Resik",
      "Rawat",
      "Rajin",
    ]);
    expect(result.find((r) => r.name === "Resik")?.value).toBe(2);
    expect(result.find((r) => r.name === "Rapi")?.value).toBe(0);
  });
});

describe("recurringFindings", () => {
  it("keeps only sub-categories appearing more than once, sorted desc", () => {
    const result = recurringFindings([
      { guidingQuestion: { subCategory: "Lantai", pillar: "RESIK" } },
      { guidingQuestion: { subCategory: "Lantai", pillar: "RESIK" } },
      { guidingQuestion: { subCategory: "Lantai", pillar: "RESIK" } },
      { guidingQuestion: { subCategory: "SOP", pillar: "RAWAT" } },
      { guidingQuestion: { subCategory: "Promosi 5R", pillar: "RAJIN" } },
      { guidingQuestion: { subCategory: "Promosi 5R", pillar: "RAJIN" } },
    ]);
    expect(result).toEqual([
      { subCategory: "Lantai", pillar: "RESIK", count: 3 },
      { subCategory: "Promosi 5R", pillar: "RAJIN", count: 2 },
    ]);
  });
});
