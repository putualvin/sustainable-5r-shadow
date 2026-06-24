import Link from "next/link";
import { ChevronLeft, LinkIcon } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { PILLAR_LABEL } from "@/lib/pillars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RedTagForm } from "@/components/forms/redtag-form";

export default async function RedTagNewPage({
  searchParams,
}: {
  searchParams: { findingId?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "redtag")) redirect("/403");

  const areas = await db.area.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  // Optional: raised from a CAPA/finding — pre-fill the area + show context.
  const finding = searchParams.findingId
    ? await db.finding.findUnique({
        where: { id: searchParams.findingId },
        include: {
          guidingQuestion: true,
          audit: { select: { areaId: true, area: { select: { name: true } } } },
        },
      })
    : null;

  // Auditee may only raise a red tag from a finding in their own area.
  if (
    finding &&
    user.roles.includes("auditee") &&
    finding.audit.areaId !== user.areaId
  ) {
    redirect("/403");
  }

  const defaultAreaId = finding?.audit.areaId ?? user.areaId;

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={finding ? `/capa/${finding.id}` : "/redtag"}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Daftarkan Red Tag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {finding && (
            <div className="flex items-start gap-2 rounded-md border border-secondary/30 bg-secondary/5 px-3 py-2 text-sm">
              <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <p>
                Terkait temuan{" "}
                <span className="font-medium">
                  {PILLAR_LABEL[finding.guidingQuestion.pillar]} ·{" "}
                  {finding.guidingQuestion.subCategory}
                </span>{" "}
                di {finding.audit.area.name}.
              </p>
            </div>
          )}
          <RedTagForm
            areas={areas}
            defaultAreaId={defaultAreaId}
            findingId={finding?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
