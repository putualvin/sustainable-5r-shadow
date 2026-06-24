import { format } from "date-fns";
import { id } from "date-fns/locale";

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// "2026-06" -> "Jun 2026"
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return "";
  const [y, m] = period.split("-");
  const idx = Number(m) - 1;
  return `${MONTHS_ID[idx] ?? m} ${y}`;
}

// "2026-06" -> "2026-05" (the previous month's period key).
export function prevPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-based; m-2 = previous month index
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(d: Date | string): string {
  return format(new Date(d), "d MMM yyyy", { locale: id });
}

export function formatDateTime(d: Date | string): string {
  return format(new Date(d), "d MMM yyyy, HH:mm", { locale: id });
}
