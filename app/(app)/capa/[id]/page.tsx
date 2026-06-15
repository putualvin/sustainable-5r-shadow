import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ImageOff } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/rbac";
import { PILLAR_LABEL } from "@/lib/pillars";
import { formatPeriod } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CapaForm } from "@/components/forms/capa-form";

export default async function CapaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "capa")) redirect("/403");

  const finding = await db.finding.findUnique({
    where: { id: params.id },
    include: {
      capa: true,
      guidingQuestion: true,
      audit: { include: { area: true } },
    },
  });
  if (!finding) notFound();

  if (user.role === "auditee" && finding.audit.areaId !== user.areaId) {
    redirect("/403");
  }

  const c = finding.capa;
  const defaults = {
    rootCause: c?.rootCause ?? "",
    correctiveAction: c?.correctiveAction ?? "",
    preventiveAction: c?.preventiveAction ?? "",
    status: c?.status ?? ("PROGRESS" as const),
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

      {/* Form CAPA */}
      <Card>
        <CardHeader>
          <CardTitle>{c ? "Perbarui CAPA" : "Isi CAPA"}</CardTitle>
        </CardHeader>
        <CardContent>
          <CapaForm findingId={finding.id} defaults={defaults} />
        </CardContent>
      </Card>
    </div>
  );
}
