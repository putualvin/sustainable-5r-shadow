import type { CapaStatus } from "@prisma/client";

const MAP: Record<CapaStatus, { label: string; cls: string }> = {
  DONE: { label: "Done", cls: "bg-success/10 text-success" },
  PROGRESS: { label: "Progress", cls: "bg-info/10 text-info" },
  NO_PROGRESS: { label: "No Progress", cls: "bg-danger/10 text-danger" },
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
  { value: "DONE", label: "Done" },
  { value: "PROGRESS", label: "Progress" },
  { value: "NO_PROGRESS", label: "No Progress" },
];
