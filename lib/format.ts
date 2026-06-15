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

export function formatDate(d: Date | string): string {
  return format(new Date(d), "d MMM yyyy", { locale: id });
}

export function formatDateTime(d: Date | string): string {
  return format(new Date(d), "d MMM yyyy, HH:mm", { locale: id });
}
