import { TriangleAlert } from "lucide-react";

export function DemoBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-[70] flex min-h-9 items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-xs font-semibold text-warning-foreground sm:text-sm"
    >
      <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      Demo publik — gunakan data dummy saja. Jangan masukkan data atau foto
      perusahaan.
    </div>
  );
}
