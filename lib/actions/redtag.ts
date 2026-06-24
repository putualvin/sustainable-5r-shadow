"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { photoDataUrl } from "@/lib/upload";
import { RETENTION_DAYS } from "@/lib/redtag";
import { redTagSchema, redTagDecisionSchema } from "@/lib/schemas/redtag";

const DAY = 1000 * 60 * 60 * 24;

export type RedTagActionState = { error?: string };

export async function createRedTag(
  _prev: RedTagActionState,
  formData: FormData
): Promise<RedTagActionState> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "redtag")) return { error: "Akses ditolak." };

  const parsed = redTagSchema.safeParse({
    areaId: formData.get("areaId"),
    name: formData.get("name"),
    category: formData.get("category"),
    reason: formData.get("reason"),
    location: formData.get("location"),
    findingId: formData.get("findingId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  // If raised from a CAPA/finding, link it and anchor the area to the finding's
  // area (keeps the red tag consistent with its source).
  let findingId: string | null = null;
  let areaId = parsed.data.areaId;
  if (parsed.data.findingId) {
    const finding = await db.finding.findUnique({
      where: { id: parsed.data.findingId },
      include: { audit: { select: { areaId: true } } },
    });
    if (finding) {
      findingId = finding.id;
      areaId = finding.audit.areaId;
    }
  }

  const year = new Date().getFullYear();
  const seq =
    (await db.redTag.count({
      where: { tagNumber: { startsWith: `RT-${year}-` } },
    })) + 1;
  const tagNumber = `RT-${year}-${String(seq).padStart(3, "0")}`;

  const registeredAt = new Date();
  const dueDate = new Date(
    registeredAt.getTime() + RETENTION_DAYS[parsed.data.location] * DAY
  );

  const photoPath = photoDataUrl(formData.get("photo"));

  await db.redTag.create({
    data: {
      tagNumber,
      areaId,
      findingId,
      name: parsed.data.name,
      category: parsed.data.category,
      reason: parsed.data.reason,
      location: parsed.data.location,
      photoPath,
      registeredAt,
      dueDate,
    },
  });

  revalidatePath("/redtag");
  revalidatePath("/");
  if (findingId) {
    revalidatePath(`/capa/${findingId}`);
    redirect(`/capa/${findingId}?redtag=1`);
  }
  redirect("/redtag?created=1");
}

// Disposal decision — coordinator only.
export async function decideRedTag(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || (!user.roles.includes("kord_red_tag") && !user.roles.includes("admin"))) {
    redirect("/403");
  }

  const parsed = redTagDecisionSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) redirect("/redtag");

  const updated = await db.redTag.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.decision, decidedAt: new Date() },
  });

  revalidatePath("/redtag");
  revalidatePath(`/redtag/${parsed.data.id}`);
  revalidatePath("/"); // home red-tag queue + KPI
  if (updated.findingId) revalidatePath(`/capa/${updated.findingId}`);
  redirect(`/redtag/${parsed.data.id}`);
}
