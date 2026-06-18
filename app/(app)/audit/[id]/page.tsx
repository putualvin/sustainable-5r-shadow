import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Trash2, Send, CheckCircle2, ImageOff } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/rbac";
import { PILLAR_LABEL } from "@/lib/pillars";
import { formatPeriod } from "@/lib/format";
import { deleteFinding, submitAudit } from "@/lib/actions/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddFindingForm } from "@/components/forms/add-finding-form";

export default async function AuditDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { submitted?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) redirect("/403");

  const audit = await db.audit.findUnique({
    where: { id: params.id },
    include: {
      area: true,
      auditor: { select: { name: true } },
      findings: {
        include: { guidingQuestion: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!audit) notFound();

  // Auditors may only open their own audits.
  if (user.roles.includes("auditor") && audit.auditorId !== user.id) redirect("/403");

  const isDraft = audit.status === "DRAFT";
  const canEdit = isDraft && user.roles.includes("auditor") && audit.auditorId === user.id;

  const guidingQuestions = await db.guidingQuestion.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, pillar: true, subCategory: true, description: true },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/audit"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      {searchParams.submitted && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-5 w-5" /> Audit berhasil dikirim &
          didistribusikan ke PIC area.
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{audit.area.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatPeriod(audit.period)} · {audit.auditor.name} ·{" "}
            {audit.findings.length} temuan
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            isDraft ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
          }`}
        >
          {isDraft ? "Draft" : "Terkirim"}
        </span>
      </div>

      {/* Form tambah temuan (hanya draft, milik auditor) */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Temuan</CardTitle>
          </CardHeader>
          <CardContent>
            <AddFindingForm
              auditId={audit.id}
              guidingQuestions={guidingQuestions}
            />
          </CardContent>
        </Card>
      )}

      {/* Daftar temuan */}
      <section className="space-y-3">
        <h2 className="font-semibold">Daftar Temuan ({audit.findings.length})</h2>
        {audit.findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada temuan. {canEdit ? "Tambahkan melalui formulir di atas." : ""}
          </p>
        ) : (
          <div className="space-y-3">
            {audit.findings.map((f) => (
              <Card key={f.id}>
                <CardContent className="flex gap-4 p-4">
                  {f.photoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.photoPath}
                      alt="Foto temuan"
                      className="h-20 w-20 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {PILLAR_LABEL[f.guidingQuestion.pillar]}
                      </span>
                      <span className="text-sm font-medium">
                        {f.guidingQuestion.subCategory}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{f.description}</p>
                    {f.locationDetail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Lokasi: {f.locationDetail}
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <form action={deleteFinding}>
                      <input type="hidden" name="findingId" value={f.id} />
                      <input type="hidden" name="auditId" value={audit.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus temuan"
                        className="text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Submit */}
      {canEdit && (
        <form action={submitAudit} className="flex justify-end">
          <input type="hidden" name="auditId" value={audit.id} />
          <Button type="submit" className="gap-2">
            <Send className="h-4 w-4" /> Kirim & Distribusikan
          </Button>
        </form>
      )}
    </div>
  );
}
