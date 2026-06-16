import { FileText, ExternalLink, Trash2, Plus } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { DOC_CATEGORIES } from "@/lib/documents";
import { deleteDocument } from "@/lib/actions/document";
import { DocumentForm } from "@/components/forms/document-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const canManage = user.role === "komite_unit" || user.role === "admin";

  const docs = await db.document.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dokumen 5R</h1>
        <p className="text-sm text-muted-foreground">
          Panduan, SOP, standar, dan formulir referensi
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Tambah Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentForm />
          </CardContent>
        </Card>
      )}

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Belum ada dokumen</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {canManage
              ? "Tambahkan dokumen referensi menggunakan formulir di atas."
              : "Komite Unit belum mengunggah dokumen."}
          </p>
        </div>
      ) : (
        DOC_CATEGORIES.map((cat) => {
          const items = docs.filter((d) => d.category === cat.key);
          if (items.length === 0) return null;
          return (
            <section key={cat.key} className="space-y-3">
              <h2 className="font-semibold">{cat.label}</h2>
              <Card>
                <ul className="divide-y">
                  {items.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start gap-3 p-4"
                    >
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{d.title}</p>
                          <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary tabular-nums">
                            {d.version}
                          </span>
                        </div>
                        {d.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {d.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {d.uploadedBy ? `${d.uploadedBy} · ` : ""}
                          {formatDate(d.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {d.fileUrl ? (
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="gap-1">
                              <ExternalLink className="h-4 w-4" /> Buka
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Berkas belum tersedia
                          </span>
                        )}
                        {canManage && (
                          <form action={deleteDocument}>
                            <input type="hidden" name="id" value={d.id} />
                            <Button
                              size="icon"
                              variant="ghost"
                              type="submit"
                              aria-label="Hapus dokumen"
                              className="text-muted-foreground hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
