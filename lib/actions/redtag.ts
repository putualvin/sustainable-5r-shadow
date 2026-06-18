"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { savePhoto } from "@/lib/upload";
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
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

  const photo = formData.get("photo");
  const photoPath = photo instanceof File ? await savePhoto(photo) : null;

  await db.redTag.create({
    data: {
      tagNumber,
      areaId: parsed.data.areaId,
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

  await db.redTag.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.decision, decidedAt: new Date() },
  });

  revalidatePath("/redtag");
  revalidatePath(`/redtag/${parsed.data.id}`);
  redirect(`/redtag/${parsed.data.id}`);
}
