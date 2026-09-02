"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import type { Pillar } from "@prisma/client";

import { addFinding, type FindingActionState } from "@/lib/actions/audit";
import { useLocalDraft } from "@/lib/use-local-draft";
import { PILLARS } from "@/lib/pillars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoInput } from "@/components/forms/photo-input";

type GQ = {
  id: string;
  pillar: Pillar;
  subCategory: string;
  description: string;
};

// Draft fields persisted to localStorage so input survives reload / back-nav /
// going offline (rules #7 and #8). Photos aren't persisted (binary, optional).
type Draft = {
  pillar: Pillar | "";
  gqId: string;
  locationDetail: string;
  description: string;
};
const EMPTY: Draft = {
  pillar: "",
  gqId: "",
  locationDetail: "",
  description: "",
};

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function AddFindingForm({
  auditId,
  guidingQuestions,
}: {
  auditId: string;
  guidingQuestions: GQ[];
}) {
  const [state, formAction] = useActionState<FindingActionState, FormData>(
    addFinding,
    {}
  );
  const [draft, setDraft] = useLocalDraft<Draft>(
    `draft:finding:${auditId}`,
    EMPTY
  );
  const [photoKey, setPhotoKey] = useState(0);

  const subOptions = useMemo(
    () => guidingQuestions.filter((g) => g.pillar === draft.pillar),
    [guidingQuestions, draft.pillar]
  );
  const selectedGq = guidingQuestions.find((g) => g.id === draft.gqId);

  // Clear the draft after a successful add so the next finding starts fresh.
  useEffect(() => {
    if (!state?.ok) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDraft(EMPTY);
      setPhotoKey((k) => k + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [state, setDraft]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="auditId" value={auditId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pillar">Kategori 5R</Label>
          <select
            id="pillar"
            className={selectClass}
            value={draft.pillar}
            onChange={(e) =>
              setDraft((d) => ({ ...d, pillar: e.target.value as Pillar, gqId: "" }))
            }
          >
            <option value="">Pilih kategori…</option>
            {PILLARS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guidingQuestionId">Sub-kategori</Label>
          <select
            id="guidingQuestionId"
            name="guidingQuestionId"
            className={selectClass}
            value={draft.gqId}
            onChange={(e) => setDraft((d) => ({ ...d, gqId: e.target.value }))}
            disabled={!draft.pillar}
          >
            <option value="">
              {draft.pillar ? "Pilih sub-kategori…" : "Pilih kategori dulu"}
            </option>
            {subOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.subCategory}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedGq && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {selectedGq.description}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="locationDetail">Lokasi spesifik (opsional)</Label>
        <Input
          id="locationDetail"
          name="locationDetail"
          placeholder="mis. dekat stasiun kerja A"
          value={draft.locationDetail}
          onChange={(e) =>
            setDraft((d) => ({ ...d, locationDetail: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi temuan</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Jelaskan ketidaksesuaian yang ditemukan…"
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
        />
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Prioritas <strong>Low/High</strong> ditetapkan oleh Komite Unit setelah
        audit dikirim. Temuan berulang dibuat melalui verifikasi daftar bulan
        sebelumnya, bukan ditandai manual di formulir ini.
      </p>

      <div className="space-y-2">
        <Label>Foto (opsional)</Label>
        <PhotoInput key={photoKey} name="photo" />
      </div>

      {state?.error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
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
      {pending ? "Menyimpan…" : "Tambah Temuan"}
    </Button>
  );
}
