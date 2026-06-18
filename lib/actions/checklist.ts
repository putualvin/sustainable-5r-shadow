"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { savePhoto } from "@/lib/upload";

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function submitChecklist(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "checklist")) redirect("/403");

  if (!user.areaId) redirect("/checklist");
  const area = await db.area.findUnique({ where: { id: user.areaId } });
  if (!area || !area.group) redirect("/checklist");

  const items = await db.checklistItem.findMany({
    where: { group: area.group, active: true },
    orderBy: { order: "asc" },
  });
  if (items.length === 0) redirect("/checklist");

  const shiftRaw = parseInt(String(formData.get("shift") ?? "1"), 10);
  const shift = [1, 2, 3].includes(shiftRaw) ? shiftRaw : 1;
  const date = todayStr();

  // Build responses; score = percent compliant.
  let compliantCount = 0;
  const responses: {
    itemId: string;
    compliant: boolean;
    note: string | null;
    photoPath: string | null;
  }[] = [];

  for (const item of items) {
    const compliant = formData.get(`compliant_${item.id}`) !== "no"; // default Sesuai
    if (compliant) compliantCount++;
    const note = String(formData.get(`note_${item.id}`) ?? "").trim() || null;
    const photo = formData.get(`photo_${item.id}`);
    const photoPath =
      !compliant && photo instanceof File ? await savePhoto(photo) : null;
    responses.push({ itemId: item.id, compliant, note, photoPath });
  }

  const score = Math.round((compliantCount / items.length) * 100);

  // Upsert the run for this area/date/shift, then replace its responses.
  const run = await db.checklistRun.upsert({
    where: { areaId_date_shift: { areaId: area.id, date, shift } },
    update: { score },
    create: { areaId: area.id, date, shift, score },
  });
  await db.checklistResponse.deleteMany({ where: { runId: run.id } });
  await db.checklistResponse.createMany({
    data: responses.map((r) => ({ ...r, runId: run.id })),
  });

  revalidatePath("/checklist");
  revalidatePath("/");
  redirect("/checklist?saved=1");
}
