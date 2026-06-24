import Link from "next/link";

import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

// Period selector rendered as links (URL holds the active period, not state).
export function PeriodTabs({
  periods,
  active,
  basePath,
}: {
  periods: string[];
  active: string;
  basePath: string;
}) {
  if (periods.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((p) => (
        <Link
          key={p}
          href={`${basePath}?period=${p}`}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            p === active
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:border-primary/40"
          )}
        >
          {formatPeriod(p)}
        </Link>
      ))}
    </div>
  );
}
