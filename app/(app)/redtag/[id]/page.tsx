import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ImageOff } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/rbac";
import {
  STATUS_META,
  LOCATION_OPTIONS,
  DECISION_OPTIONS,
  urgency,
} from "@/lib/redtag";
import { decideRedTag } from "@/lib/actions/redtag";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/shared/qr-code";
import { cn } from "@/lib/utils";

export default async function RedTagDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "redtag")) redirect("/403");

  const tag = await db.redTag.findUnique({
    where: { id: params.id },
    include: { area: true },
  });
  if (!tag) notFound();

  const u = urgency(tag.dueDate, tag.status);
  const locationLabel =
    LOCATION_OPTIONS.find((l) => l.value === tag.location)?.label ?? tag.location;
  const canDecide =
    (user.role === "kord_red_tag" || user.role === "admin") &&
    tag.status === "OPEN";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/redtag"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-medium text-primary">
            {tag.tagNumber}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{tag.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tag.area.name} · {tag.category}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            STATUS_META[tag.status].cls
          )}
        >
          {STATUS_META[tag.status].label}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Foto + info */}
        <Card className="md:col-span-2">
          <CardContent className="space-y-4 p-4">
            <div className="flex gap-4">
              {tag.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tag.photoPath}
                  alt="Foto barang"
                  className="h-28 w-28 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
              <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label="Lokasi" value={locationLabel} />
                <Field label="Didaftarkan" value={formatDate(tag.registeredAt)} />
                <Field label="Tenggat" value={formatDate(tag.dueDate)} />
                <div>
                  <dt className="text-xs text-muted-foreground">Status Tenggat</dt>
                  <dd>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", u.cls)}>
                      {u.label}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alasan</p>
              <p className="text-sm">{tag.reason}</p>
            </div>
          </CardContent>
        </Card>

        {/* QR */}
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-4">
            <QrCode value={tag.tagNumber} size={120} />
            <p className="text-center text-xs text-muted-foreground">
              Pindai untuk identifikasi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline status */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="font-medium">Didaftarkan</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(tag.registeredAt)}
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  tag.status === "OPEN" ? "bg-muted-foreground/40" : "bg-success"
                )}
              />
              <div>
                <p className="font-medium">
                  {tag.status === "OPEN"
                    ? "Menunggu keputusan koordinator"
                    : `Keputusan: ${STATUS_META[tag.status].label}`}
                </p>
                {tag.decidedAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(tag.decidedAt)}
                  </p>
                )}
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Keputusan koordinator */}
      {canDecide && (
        <Card>
          <CardHeader>
            <CardTitle>Keputusan Disposal (Koordinator)</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={decideRedTag} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={tag.id} />
              <div className="space-y-2">
                <label htmlFor="decision" className="text-sm font-medium">
                  Tindakan
                </label>
                <select
                  id="decision"
                  name="decision"
                  defaultValue="INTERNAL"
                  className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {DECISION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Simpan Keputusan</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
