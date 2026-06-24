import Link from "next/link";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistForm } from "@/components/forms/checklist-form";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: { shift?: string; saved?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const shift = [1, 2, 3].includes(Number(searchParams.shift))
    ? Number(searchParams.shift)
    : 1;

  const area = user.areaId
    ? await db.area.findUnique({ where: { id: user.areaId } })
    : null;

  // Checklist is per-PIC-area; non-PIC or area without items can't fill.
  if (!area || !area.group) {
    return (
      <div className="max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Checklist Harian</h1>
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Info className="h-5 w-5 shrink-0" />
            {area
              ? "Area Anda belum memiliki daftar item checklist. Hubungi komite untuk mendefinisikannya."
              : "Checklist harian diisi oleh PIC area. Akun Anda tidak terhubung ke area mana pun."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = await db.checklistItem.findMany({
    where: { group: area.group, active: true },
    orderBy: { order: "asc" },
  });

  const date = todayStr();
  const run = await db.checklistRun.findUnique({
    where: { areaId_date_shift: { areaId: area.id, date, shift } },
    include: { responses: true },
  });
  const defaults: Record<string, { compliant: boolean; note: string }> = {};
  run?.responses.forEach((r) => {
    defaults[r.itemId] = { compliant: r.compliant, note: r.note ?? "" };
  });

  const history = await db.checklistRun.findMany({
    where: { areaId: area.id },
    orderBy: [{ date: "desc" }, { shift: "desc" }],
    take: 12,
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Checklist Harian</h1>
        <p className="text-sm text-muted-foreground">
          {area.name} · {formatDate(new Date())}
        </p>
      </div>

      {searchParams.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-5 w-5" /> Checklist tersimpan.
        </div>
      )}

      {run && run.score < 90 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
          <AlertTriangle className="h-5 w-5" /> Skor shift {shift} hari ini{" "}
          {run.score}% (di bawah ambang 90%). Perlu tindak lanjut.
        </div>
      )}

      {/* Pilih shift */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <Link
            key={s}
            href={`/checklist?shift=${s}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium",
              s === shift
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground"
            )}
          >
            Shift {s}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Pengecekan Shift {shift}
            {run ? " (sudah diisi — dapat diperbarui)" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistForm
            items={items}
            shift={shift}
            defaults={defaults}
            storageKey={`draft:checklist:${area.id}:${date}:${shift}`}
          />
        </CardContent>
      </Card>

      {/* Riwayat */}
      <section className="space-y-3">
        <h2 className="font-semibold">Riwayat</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
        ) : (
          <Card>
            <ul className="divide-y">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between p-3.5 text-sm"
                >
                  <span>
                    {formatDate(h.date)} · Shift {h.shift}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
                      h.score >= 90
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    )}
                  >
                    {h.score}%
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
