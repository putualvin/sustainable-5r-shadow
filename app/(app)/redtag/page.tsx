import Link from "next/link";
import { Plus, ChevronRight, CheckCircle2 } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATUS_META, urgency } from "@/lib/redtag";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "approaching", label: "Mendekati" },
  { key: "overdue", label: "Terlambat" },
  { key: "done", label: "Selesai" },
];

export default async function RedTagListPage({
  searchParams,
}: {
  searchParams: { filter?: string; created?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const filter = searchParams.filter ?? "all";
  const now = new Date();

  const tags = await db.redTag.findMany({
    include: { area: true },
    orderBy: { registeredAt: "desc" },
  });

  const rows = tags
    .map((t) => ({ tag: t, u: urgency(t.dueDate, t.status, now) }))
    .filter(({ tag, u }) => {
      if (filter === "done") return tag.status !== "OPEN";
      if (filter === "overdue")
        return tag.status === "OPEN" && (u.daysLeft ?? 0) < 0;
      if (filter === "approaching")
        return tag.status === "OPEN" && (u.daysLeft ?? 99) >= 0 && (u.daysLeft ?? 99) <= 7;
      return true;
    });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Red Tag</h1>
          <p className="text-sm text-muted-foreground">{tags.length} item</p>
        </div>
        <Button asChild size="sm" className="gap-1">
          <Link href="/redtag/baru">
            <Plus className="h-4 w-4" /> Daftar Baru
          </Link>
        </Button>
      </div>

      {searchParams.created && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-5 w-5" /> Red Tag berhasil didaftarkan.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/redtag?filter=${f.key}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada data.</p>
      ) : (
        <Card>
          <ul className="divide-y">
            {rows.map(({ tag, u }) => (
              <li key={tag.id}>
                <Link
                  href={`/redtag/${tag.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-medium text-primary">
                        {tag.tagNumber}
                      </span>
                      <span className="text-sm font-medium">{tag.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tag.area.name} · {tag.category}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", u.cls)}>
                    {u.label}
                  </span>
                  <span
                    className={cn(
                      "hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline",
                      STATUS_META[tag.status].cls
                    )}
                  >
                    {STATUS_META[tag.status].label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
