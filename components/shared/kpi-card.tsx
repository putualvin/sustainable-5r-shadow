import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Tone = "success" | "info" | "warning" | "danger" | "neutral";

const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-foreground",
};

const TONE_BG: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-muted text-muted-foreground",
};

export function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            TONE_BG[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold tabular-nums", TONE_TEXT[tone])}>
            {value}
          </p>
          {caption && (
            <p className="truncate text-xs text-muted-foreground">{caption}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
