import type { CapaStatus } from "@prisma/client";

const MAP: Record<CapaStatus, { label: string; cls: string }> = {
  DONE: { label: "Selesai", cls: "bg-success/10 text-success" },
  PROGRESS: { label: "Proses", cls: "bg-info/10 text-info" },
  NO_PROGRESS: { label: "Belum Ada", cls: "bg-danger/10 text-danger" },
};

export function CapaStatusBadge({ status }: { status: CapaStatus }) {
  const s = MAP[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export const CAPA_STATUS_OPTIONS: { value: CapaStatus; label: string }[] = [
  { value: "DONE", label: "Selesai (Done)" },
  { value: "PROGRESS", label: "Proses (Progress)" },
  { value: "NO_PROGRESS", label: "Belum Ada (No Progress)" },
];
