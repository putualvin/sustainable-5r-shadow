import type { RedTagLocation, RedTagStatus } from "@prisma/client";

export const RETENTION_DAYS: Record<RedTagLocation, number> = {
  IN_AREA: 30,
  RT_AREA: 90,
};

export const LOCATION_OPTIONS: { value: RedTagLocation; label: string }[] = [
  { value: "IN_AREA", label: "Di Area (maks 30 hari)" },
  { value: "RT_AREA", label: "Red Tag Area (maks 90 hari)" },
];

export const CATEGORY_OPTIONS = [
  "Material",
  "Suku Cadang",
  "Peralatan / Tooling",
  "Dokumen",
  "Lainnya",
];

export const STATUS_META: Record<
  RedTagStatus,
  { label: string; cls: string }
> = {
  OPEN: { label: "Menunggu Keputusan", cls: "bg-warning/10 text-warning" },
  INTERNAL: { label: "Pakai Internal", cls: "bg-success/10 text-success" },
  EXTERNAL: { label: "Pihak Luar", cls: "bg-info/10 text-info" },
  DISPOSED: { label: "Dimusnahkan", cls: "bg-muted text-muted-foreground" },
};

export const DECISION_OPTIONS: { value: RedTagStatus; label: string }[] = [
  { value: "INTERNAL", label: "Digunakan kembali (internal)" },
  { value: "EXTERNAL", label: "Dijual / pihak luar" },
  { value: "DISPOSED", label: "Dimusnahkan" },
];

export type Urgency = {
  label: string;
  cls: string;
  daysLeft: number | null; // null when decided
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Deadline urgency for an OPEN tag; decided tags are "Selesai".
export function urgency(
  dueDate: Date,
  status: RedTagStatus,
  now: Date = new Date()
): Urgency {
  if (status !== "OPEN") {
    return { label: "Selesai", cls: "bg-muted text-muted-foreground", daysLeft: null };
  }
  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / MS_PER_DAY);
  if (daysLeft < 0)
    return { label: `Terlambat ${Math.abs(daysLeft)} hari`, cls: "bg-danger/10 text-danger", daysLeft };
  if (daysLeft <= 7)
    return { label: `${daysLeft} hari lagi`, cls: "bg-warning/10 text-warning", daysLeft };
  return { label: `${daysLeft} hari lagi`, cls: "bg-success/10 text-success", daysLeft };
}
