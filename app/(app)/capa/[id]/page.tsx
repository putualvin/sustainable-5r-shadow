import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ImageOff, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, hasAnyRole } from "@/lib/rbac";
import { PILLAR_LABEL } from "@/lib/pillars";
import { formatPeriod, formatDateTime, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CapaForm } from "@/components/forms/capa-form";
import { CapaStatusBadge } from "@/components/shared/capa-status-badge";
import { CapaVerify } from "@/components/shared/capa-verify";

export default async function CapaDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { verified?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "capa")) redirect("/403");

  const finding = await db.finding.findUnique({
    where: { id: params.id },
    include: {
      capa: true,
      guidingQuestion: true,
      audit: { include: { area: true } },
    },
  });
  if (!finding) notFound();

  if (user.roles.includes("auditee") && finding.audit.areaId !== user.areaId) {
    redirect("/403");
  }

  const c = finding.capa;
  const verified = Boolean(c?.status);
  const isAuditeeOwner =
    user.roles.includes("auditee") && finding.audit.areaId === user.areaId;
  const isKomite = hasAnyRole(user.roles, "komite_unit", "admin");
  // Auditee may fill/edit only until Komite verifies; then it is locked.
  const canEdit = isAuditeeOwner && !verified;

  const defaults = {
    rootCause: c?.rootCause ?? "",
    correctiveAction: c?.correctiveAction ?? "",
    preventiveAction: c?.preventiveAction ?? "",
    dueDate: c?.dueDate ? new Date(c.dueDate).toISOString().slice(0, 10) : "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/capa"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      {searchParams.verified && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-5 w-5" /> CAPA terverifikasi dan skor area diperbarui.
        </div>
      )}

      {/* Detail temuan */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {PILLAR_LABEL[finding.guidingQuestion.pillar]}
            </span>
            <CardTitle className="text-base">
              {finding.guidingQuestion.subCategory}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4">
            {finding.photoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={finding.photoPath}
                alt="Foto temuan"
                className="h-24 w-24 shrink-0 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                <ImageOff className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 text-sm">
              <p>{finding.description}</p>
              {finding.locationDetail && (
                <p className="mt-1 text-muted-foreground">
                  Lokasi: {finding.locationDetail}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {finding.audit.area.name} · {formatPeriod(finding.audit.period)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CAPA: form for auditee (until verified) or read-only summary */}
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>{c ? "Perbarui CAPA" : "Isi CAPA"}</CardTitle>
          </CardHeader>
          <CardContent>
            <CapaForm findingId={finding.id} defaults={defaults} />
          </CardContent>
        </Card>
      ) : c ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Rencana CAPA</CardTitle>
              {verified ? (
                <CapaStatusBadge status={c.status!} />
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                  <Clock className="h-3.5 w-3.5" /> Menunggu Verifikasi
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Akar Masalah" value={c.rootCause} />
            <Field label="Tindakan Korektif" value={c.correctiveAction} />
            <Field label="Tindakan Preventif" value={c.preventiveAction} />
            {c.dueDate && (
              <Field label="Target Selesai" value={formatDate(c.dueDate)} />
            )}
            {c.afterPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.afterPhoto}
                alt="Foto sesudah"
                className="h-28 w-28 rounded-md border object-cover"
              />
            )}
            {verified && c.verifiedBy && (
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Diverifikasi oleh {c.verifiedBy}
                {c.verifiedAt ? ` · ${formatDateTime(c.verifiedAt)}` : ""}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Auditee belum mengisi CAPA untuk temuan ini.
          </CardContent>
        </Card>
      )}

      {/* Verifikasi oleh Komite Unit */}
      {isKomite && c && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              {verified ? "Ubah Status Verifikasi" : "Verifikasi CAPA"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Tetapkan status penyelesaian. Status ini yang dihitung ke skor 5R area.
            </p>
            <CapaVerify findingId={finding.id} current={c.status} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
