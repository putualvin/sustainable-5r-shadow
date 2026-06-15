import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RedTagForm } from "@/components/forms/redtag-form";

export default async function RedTagNewPage() {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "redtag")) redirect("/403");

  const areas = await db.area.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/redtag"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Daftarkan Red Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <RedTagForm areas={areas} defaultAreaId={user.areaId} />
        </CardContent>
      </Card>
    </div>
  );
}
