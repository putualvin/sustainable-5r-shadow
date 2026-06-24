"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { addDocument, type DocumentActionState } from "@/lib/actions/document";
import { DOC_CATEGORIES } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function DocumentForm() {
  const [state, formAction] = useFormState<DocumentActionState, FormData>(
    addDocument,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Judul dokumen</Label>
          <Input id="title" name="title" placeholder="mis. Guidelines Sustainable 5R v.2" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <select id="category" name="category" className={selectClass} defaultValue="">
            <option value="">Pilih kategori…</option>
            {DOC_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Versi</Label>
          <Input id="version" name="version" placeholder="v1.0" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Tautan dokumen (opsional)</Label>
        <Input id="url" name="url" type="url" placeholder="https://…" />
        <p className="text-xs text-muted-foreground">
          Untuk demo daring, gunakan tautan. Berkas yang diunggah hanya tersimpan
          di server lokal.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Atau unggah berkas (opsional)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
          className="file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Keterangan (opsional)</Label>
        <Textarea id="description" name="description" placeholder="Ringkasan isi dokumen…" />
      </div>

      {state?.error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Dokumen berhasil ditambahkan.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending ? "Menyimpan…" : "Tambah Dokumen"}
    </Button>
  );
}
