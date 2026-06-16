"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/rbac";
import { saveDocumentFile } from "@/lib/upload";
import { logAction } from "@/lib/audit-log";
import { documentSchema } from "@/lib/schemas/document";
import { DOC_CATEGORY_LABEL } from "@/lib/documents";

// Only komite_unit / admin may publish documents (everyone may read them).
function canManage(role: string): boolean {
  return role === "komite_unit" || role === "admin";
}

export type DocumentActionState = { ok?: boolean; error?: string };

export async function addDocument(
  _prev: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "documents") || !canManage(user.role)) {
    return { error: "Akses ditolak." };
  }

  const parsed = documentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    version: formData.get("version") || undefined,
    url: formData.get("url") || "",
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  // Prefer an uploaded file; fall back to the provided URL. At least one is
  // recommended but not required (a record can be a placeholder).
  const file = formData.get("file");
  const uploaded = file instanceof File ? await saveDocumentFile(file) : null;
  const fileUrl = uploaded ?? (parsed.data.url ? parsed.data.url : null);

  const doc = await db.document.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      version: parsed.data.version?.trim() || "v1.0",
      fileUrl,
      description: parsed.data.description ?? null,
      uploadedBy: user.name,
    },
  });

  await logAction({
    action: "document.create",
    entity: "Document",
    summary: `Menambahkan dokumen “${doc.title}” (${DOC_CATEGORY_LABEL[doc.category]} · ${doc.version}).`,
  });

  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "documents") || !canManage(user.role)) {
    redirect("/403");
  }

  const id = String(formData.get("id") ?? "");
  const doc = await db.document.findUnique({ where: { id } });
  if (doc) {
    await db.document.delete({ where: { id } });
    await logAction({
      action: "document.delete",
      entity: "Document",
      summary: `Menghapus dokumen “${doc.title}”.`,
    });
  }
  revalidatePath("/documents");
}
