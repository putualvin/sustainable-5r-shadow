import type { CapaStatus } from "@prisma/client";

import { verifyCapa } from "@/lib/actions/capa";
import { CAPA_STATUS_OPTIONS } from "@/components/shared/capa-status-badge";

const TONE: Record<CapaStatus, string> = {
  DONE: "data-[active=true]:border-success data-[active=true]:bg-success/10 data-[active=true]:text-success",
  PROGRESS: "data-[active=true]:border-info data-[active=true]:bg-info/10 data-[active=true]:text-info",
  NO_PROGRESS: "data-[active=true]:border-danger data-[active=true]:bg-danger/10 data-[active=true]:text-danger",
};

// Komite Unit verification control: pick the closing status. Each option is a
// form posting the verifyCapa server action.
export function CapaVerify({
  findingId,
  current,
}: {
  findingId: string;
  current: CapaStatus | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CAPA_STATUS_OPTIONS.map((o) => (
        <form key={o.value} action={verifyCapa}>
          <input type="hidden" name="findingId" value={findingId} />
          <input type="hidden" name="status" value={o.value} />
          <button
            type="submit"
            data-active={current === o.value}
            className={`rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 ${TONE[o.value]}`}
          >
            {o.label}
          </button>
        </form>
      ))}
    </div>
  );
}
