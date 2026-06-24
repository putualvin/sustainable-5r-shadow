import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import type { Prisma, Pillar } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAnyRole } from "@/lib/rbac";
import { PILLAR_LABEL } from "@/lib/pillars";
import { Card } from "@/components/ui/card";
import { CapaStatusBadge } from "@/components/shared/capa-status-badge";

export default async function CapaInboxPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const isKomite = hasAnyRole(user.roles, "komite_unit", "admin");

  // Auditee sees only their area; komite/admin see all.
  const auditWhere: Prisma.AuditWhereInput = { status: "SUBMITTED" };
  if (user.roles.includes("auditee") && !isKomite) {
    auditWhere.areaId = user.areaId ?? "__none__";
  }

  const findings = await db.finding.findMany({
    where: { audit: auditWhere },
    include: {
      capa: true,
      guidingQuestion: true,
      audit: { include: { area: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = findings.filter((f) => !f.capa); // auditee belum mengisi
  const awaiting = findings.filter((f) => f.capa && !f.capa.status); // menunggu verifikasi
  const verified = findings.filter((f) => f.capa && f.capa.status); // sudah diverifikasi

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CAPA</h1>
        <p className="text-sm text-muted-foreground">
          {isKomite
            ? "Verifikasi tindak lanjut temuan audit dan tetapkan statusnya."
            : "Isi tindak lanjut temuan (akar masalah, korektif, preventif). Status ditetapkan Komite."}
        </p>
      </div>

      {searchParams.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-5 w-5" /> CAPA tersimpan. Menunggu verifikasi Komite.
        </div>
      )}

      {isKomite ? (
        <>
          <Section title={`Menunggu Verifikasi (${awaiting.length})`}>
            {awaiting.length === 0 ? (
              <Empty>Tidak ada CAPA yang menunggu verifikasi.</Empty>
            ) : (
              awaiting.map((f) => <Row key={f.id} f={f} badge={<PendingBadge />} />)
            )}
          </Section>

          <Section title={`Terverifikasi (${verified.length})`}>
            {verified.length === 0 ? (
              <Empty>Belum ada CAPA terverifikasi.</Empty>
            ) : (
              verified.map((f) => (
                <Row key={f.id} f={f} badge={<CapaStatusBadge status={f.capa!.status!} />} />
              ))
            )}
          </Section>

          <Section title={`Belum Diisi Auditee (${pending.length})`}>
            {pending.length === 0 ? (
              <Empty>Semua temuan sudah ditindaklanjuti auditee.</Empty>
            ) : (
              pending.map((f) => <Row key={f.id} f={f} />)
            )}
          </Section>
        </>
      ) : (
        <>
          <Section title={`Perlu Diisi (${pending.length})`}>
            {pending.length === 0 ? (
              <Empty>Tidak ada temuan yang menunggu CAPA.</Empty>
            ) : (
              pending.map((f) => <Row key={f.id} f={f} />)
            )}
          </Section>

          <Section title={`Menunggu Verifikasi (${awaiting.length})`}>
            {awaiting.length === 0 ? (
              <Empty>Tidak ada CAPA yang menunggu verifikasi.</Empty>
            ) : (
              awaiting.map((f) => <Row key={f.id} f={f} badge={<PendingBadge />} />)
            )}
          </Section>

          <Section title={`Terverifikasi (${verified.length})`}>
            {verified.length === 0 ? (
              <Empty>Belum ada CAPA terverifikasi.</Empty>
            ) : (
              verified.map((f) => (
                <Row key={f.id} f={f} badge={<CapaStatusBadge status={f.capa!.status!} />} />
              ))
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      <Card>
        <ul className="divide-y">{children}</ul>
      </Card>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="p-4 text-sm text-muted-foreground">{children}</li>;
}

function PendingBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
      <Clock className="h-3.5 w-3.5" /> Menunggu
    </span>
  );
}

type RowFinding = {
  id: string;
  number: number;
  description: string;
  guidingQuestion: { pillar: Pillar; subCategory: string };
  audit: { area: { name: string } };
};

function Row({ f, badge }: { f: RowFinding; badge?: React.ReactNode }) {
  return (
    <li>
      <Link href={`/capa/${f.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-foreground/90 px-2 py-0.5 text-xs font-bold text-background tabular-nums">
              #{f.number}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {PILLAR_LABEL[f.guidingQuestion.pillar]}
            </span>
            <span className="text-sm font-medium">{f.guidingQuestion.subCategory}</span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{f.description}</p>
          <p className="text-xs text-muted-foreground">{f.audit.area.name}</p>
        </div>
        {badge}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
