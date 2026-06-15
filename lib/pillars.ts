import type { Pillar } from "@prisma/client";

// Display labels for the 5 R pillars (UI in Bahasa Indonesia).
export const PILLARS: { key: Pillar; label: string }[] = [
  { key: "RINGKAS", label: "Ringkas" },
  { key: "RAPI", label: "Rapi" },
  { key: "RESIK", label: "Resik" },
  { key: "RAWAT", label: "Rawat" },
  { key: "RAJIN", label: "Rajin" },
];

export const PILLAR_LABEL: Record<Pillar, string> = {
  RINGKAS: "Ringkas",
  RAPI: "Rapi",
  RESIK: "Resik",
  RAWAT: "Rawat",
  RAJIN: "Rajin",
};
