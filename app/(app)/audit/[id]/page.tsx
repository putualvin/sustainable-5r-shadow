import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  Trash2,
  Send,
  CheckCircle2,
  ImageOff,
  Target,
  History,
  RotateCcw,
  Repeat,
  ShieldCheck,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess, hasAnyRole } from "@/lib/rbac";
import { PILLAR_LABEL } from "@/lib/pillars";
import { formatPeriod, prevPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteFinding,
  submitAudit,
  reviewPreviousFinding,
  setFindingPriority,
  undoFindingReview,
} from "@/lib/actions/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddFindingForm } from "@/components/forms/add-finding-form";
import { CapaStatusBadge } from "@/components/shared/capa-status-badge";

export default async function AuditDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ submitted?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "audit")) redirect("/403");

  const audit = await db.audit.findUnique({
    where: { id: params.id },
    include: {
      area: true,
      auditor: { select: { name: true } },
      findings: {
        include: { guidingQuestion: true, reviewAsCarried: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!audit) notFound();

  // Auditors may only open their own audits.
  if (user.roles.includes("auditor") && audit.auditorId !== user.id) redirect("/403");

  const isDraft = audit.status === "DRAFT";
  const canEdit = isDraft && user.roles.includes("auditor") && audit.auditorId === user.id;
  const canSetPriority =
    !isDraft && hasAnyRole(user.roles, "komite_unit", "admin");

  const guidingQuestions = await db.guidingQuestion.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, pillar: true, subCategory: true, description: true },
  });

  // §5.4 — before recording new findings, the auditor verifies the area's
  // previous-period findings (still present → recurring, or already handled).
  const lastPeriod = prevPeriod(audit.period);
  const prevFindings = await db.finding.findMany({
    where: {
      audit: { areaId: audit.areaId, period: lastPeriod, status: "SUBMITTED" },
    },
    include: { guidingQuestion: true, capa: true },
    orderBy: { createdAt: "asc" },
  });
  const reviews =
    prevFindings.length > 0
      ? await db.findingReview.findMany({ where: { auditId: audit.id } })
      : [];
  const reviewByPrev = new Map(reviews.map((r) => [r.prevFindingId, r]));
  const reviewedCount = prevFindings.filter((f) => reviewByPrev.has(f.id)).length;
  const reviewDone = prevFindings.length > 0 && reviewedCount === prevFindings.length;

  // Target temuan per area = 21 = 20 dari guiding question + 1 temuan berulang (§5.1).
  const TARGET = 21;
  const TARGET_REGULER = 20;
  const total = audit.findings.length;
  const berulang = audit.findings.filter((f) => f.isRecurring).length;
  const reguler = total - berulang;
  const countHigh = audit.findings.filter((f) => f.kategori === "HIGH").length;
  const countLow = audit.findings.filter((f) => f.kategori === "LOW").length;
  const countUnassigned = total - countHigh - countLow;
  const pct = Math.min(100, Math.round((total / TARGET) * 100));
  const reached = total >= TARGET;

  return (
    <div className="max-w-6xl space-y-6">
      <Link
        href="/audit"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      {searchParams.submitted && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-5 w-5" /> Audit berhasil dikirim ke
          Komite Unit untuk penetapan prioritas.
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

      {/* Target temuan 21 (20 + 1) */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-semibold">
              <Target className="h-4 w-4 text-primary" /> Target Temuan
            </span>
            <span className="tabular-nums text-sm">
              <span className={cn("text-lg font-bold", reached ? "text-success" : "text-foreground")}>
                {total}
              </span>
              <span className="text-muted-foreground"> / {TARGET}</span>
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={total}
            aria-valuemax={TARGET}
          >
            <div
              className={cn("h-full rounded-full transition-all", reached ? "bg-success" : "bg-warning")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            20 dari guiding question + 1 temuan berulang
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip>
              Reguler {reguler}/{TARGET_REGULER}
            </Chip>
            <Chip>Berulang {berulang}/1</Chip>
            <Chip className="bg-muted text-muted-foreground">Low {countLow}</Chip>
            <Chip className="bg-danger/10 text-danger">High {countHigh}</Chip>
            {countUnassigned > 0 && (
              <Chip className="bg-warning/10 text-warning">
                Menunggu Komite {countUnassigned}
              </Chip>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verifikasi temuan bulan lalu (§5.4) — sebelum mencatat temuan baru */}
      {prevFindings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Verifikasi Temuan{" "}
                {formatPeriod(lastPeriod)}
              </CardTitle>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                  reviewDone
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                )}
              >
                {reviewedCount}/{prevFindings.length} diverifikasi
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {canEdit ? (
                <>
                  Sebelum mencatat temuan baru, periksa temuan bulan lalu:
                  tandai <strong>Masih ada</strong> bila kondisi ditemukan kembali
                  (otomatis menjadi <strong>temuan berulang</strong>) atau{" "}
                  <strong>Sudah ditangani</strong> bila sudah selesai.
                </>
              ) : (
                <>
                  Riwayat temuan bulan lalu beserta prioritas dan status tindak
                  lanjut yang ditetapkan Komite Unit.
                </>
              )}
            </p>

            <ul className="space-y-3">
              {prevFindings.map((f) => {
                const review = reviewByPrev.get(f.id);
                return (
                  <li
                    key={f.id}
                    className="rounded-lg border bg-card/50 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {PILLAR_LABEL[f.guidingQuestion.pillar]}
                      </span>
                      <PriorityBadge priority={f.kategori} />
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {f.capa?.status ? (
                        <CapaStatusBadge status={f.capa.status} />
                      ) : f.capa ? (
                        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                          Menunggu verifikasi Komite
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          Belum diisi PIC
                        </span>
                      )}
                      {f.capa?.dueDate &&
                        f.capa.status !== "DONE" &&
                        f.capa.dueDate.getTime() < audit.createdAt.getTime() && (
                          <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                            Parking Lot
                          </span>
                        )}
                      {f.capa?.woScPoNumber && (
                        <span className="text-xs text-muted-foreground">
                          WO/SC/PO: {f.capa.woScPoNumber}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {review ? (
                        <>
                          {review.stillExists ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                              <Repeat className="h-3.5 w-3.5" /> Masih ada · jadi
                              temuan berulang
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Sudah
                              ditangani
                            </span>
                          )}
                          {canEdit && (
                            <form action={undoFindingReview}>
                              <input type="hidden" name="auditId" value={audit.id} />
                              <input type="hidden" name="reviewId" value={review.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-muted-foreground"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Ubah
                              </Button>
                            </form>
                          )}
                        </>
                      ) : canEdit ? (
                        <>
                          <form action={reviewPreviousFinding}>
                            <input type="hidden" name="auditId" value={audit.id} />
                            <input type="hidden" name="prevFindingId" value={f.id} />
                            <input type="hidden" name="verdict" value="exists" />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="gap-1 border-warning/40 text-warning hover:bg-warning/10"
                            >
                              <Repeat className="h-3.5 w-3.5" /> Masih ada
                            </Button>
                          </form>
                          <form action={reviewPreviousFinding}>
                            <input type="hidden" name="auditId" value={audit.id} />
                            <input type="hidden" name="prevFindingId" value={f.id} />
                            <input type="hidden" name="verdict" value="handled" />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="gap-1 border-success/40 text-success hover:bg-success/10"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Sudah
                              ditangani
                            </Button>
                          </form>
                        </>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          Belum ditinjau auditor
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {prevFindings.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Temuan{" "}
              {formatPeriod(lastPeriod)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tidak ada temuan audit bulan sebelumnya untuk area ini.
            </p>
          </CardContent>
        </Card>
      )}

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
              <Card key={f.id} id={`finding-${f.id}`}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
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
                      <span className="rounded-full bg-foreground/90 px-2 py-0.5 text-xs font-bold text-background tabular-nums">
                        #{f.number}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {PILLAR_LABEL[f.guidingQuestion.pillar]}
                      </span>
                      <PriorityBadge priority={f.kategori} />
                      {f.isRecurring && (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                          Berulang
                        </span>
                      )}
                      {f.reviewAsCarried && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          dari bulan lalu
                        </span>
                      )}
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
                    {f.reviewAsCarried && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Dibawa dari verifikasi temuan bulan lalu — kelola lewat
                        bagian Verifikasi di atas.
                      </p>
                    )}
                  </div>

                  {canEdit && !f.reviewAsCarried && (
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

                  {canSetPriority && (
                    <div className="w-full shrink-0 border-t pt-3 sm:w-auto sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                      <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" /> Prioritas Komite
                      </p>
                      <div className="flex gap-2">
                        {(["LOW", "HIGH"] as const).map((priority) => (
                          <form key={priority} action={setFindingPriority}>
                            <input type="hidden" name="findingId" value={f.id} />
                            <input type="hidden" name="priority" value={priority} />
                            <Button
                              type="submit"
                              size="sm"
                              variant={f.kategori === priority ? "default" : "outline"}
                              className={cn(
                                priority === "HIGH" &&
                                  f.kategori !== priority &&
                                  "border-danger/40 text-danger hover:bg-danger/10"
                              )}
                            >
                              {priority === "HIGH" ? "High" : "Low"}
                            </Button>
                          </form>
                        ))}
                      </div>
                    </div>
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
            <Send className="h-4 w-4" /> Kirim ke Komite Unit
          </Button>
        </form>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "LOW" | "HIGH" | null }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        priority === "HIGH"
          ? "bg-danger/10 text-danger"
          : priority === "LOW"
            ? "bg-muted text-muted-foreground"
            : "bg-warning/10 text-warning"
      )}
    >
      {priority === "HIGH"
        ? "High"
        : priority === "LOW"
          ? "Low"
          : "Prioritas belum ditetapkan"}
    </span>
  );
}

function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary tabular-nums",
        className
      )}
    >
      {children}
    </span>
  );
}
