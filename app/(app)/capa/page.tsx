import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
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

  // Auditee sees only their area; komite/admin see all.
  const auditWhere: Prisma.AuditWhereInput = { status: "SUBMITTED" };
  if (user.roles.includes("auditee")) auditWhere.areaId = user.areaId ?? "__none__";

  const findings = await db.finding.findMany({
    where: { audit: auditWhere },
    include: {
      capa: true,
      guidingQuestion: true,
      audit: { include: { area: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = findings.filter((f) => !f.capa);
  const filled = findings.filter((f) => f.capa);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CAPA</h1>
        <p className="text-sm text-muted-foreground">
          Tindak lanjut temuan audit (akar masalah, korektif, preventif).
        </p>
      </div>

      {searchParams.saved && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-5 w-5" /> CAPA tersimpan dan skor area
          diperbarui.
        </div>
      )}

      <Section title={`Perlu Tindak Lanjut (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty>Tidak ada temuan yang menunggu CAPA.</Empty>
        ) : (
          pending.map((f) => (
            <FindingRow
              key={f.id}
              href={`/capa/${f.id}`}
              pillar={PILLAR_LABEL[f.guidingQuestion.pillar]}
              title={f.guidingQuestion.subCategory}
              desc={f.description}
              area={f.audit.area.name}
            />
          ))
        )}
      </Section>

      <Section title={`Sudah Diisi (${filled.length})`}>
        {filled.length === 0 ? (
          <Empty>Belum ada CAPA yang diisi.</Empty>
        ) : (
          filled.map((f) => (
            <FindingRow
              key={f.id}
              href={`/capa/${f.id}`}
              pillar={PILLAR_LABEL[f.guidingQuestion.pillar]}
              title={f.guidingQuestion.subCategory}
              desc={f.description}
              area={f.audit.area.name}
              badge={<CapaStatusBadge status={f.capa!.status} />}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function FindingRow({
  href,
  pillar,
  title,
  desc,
  area,
  badge,
}: {
  href: string;
  pillar: string;
  title: string;
  desc: string;
  area: string;
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 p-4 hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {pillar}
            </span>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{desc}</p>
          <p className="text-xs text-muted-foreground">{area}</p>
        </div>
        {badge}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
