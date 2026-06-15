"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Pillar } from "@prisma/client";

import { addFinding, type FindingActionState } from "@/lib/actions/audit";
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

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function AddFindingForm({
  auditId,
  guidingQuestions,
}: {
  auditId: string;
  guidingQuestions: GQ[];
}) {
  const [state, formAction] = useFormState<FindingActionState, FormData>(
    addFinding,
    {}
  );
  const [pillar, setPillar] = useState<Pillar | "">("");
  const [gqId, setGqId] = useState("");
  const [photoKey, setPhotoKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const subOptions = useMemo(
    () => guidingQuestions.filter((g) => g.pillar === pillar),
    [guidingQuestions, pillar]
  );
  const selectedGq = guidingQuestions.find((g) => g.id === gqId);

  // Reset the form after a successful add so the auditor can log the next one.
  // Reset native fields via the form ref + remount only the PhotoInput (not the
  // whole form, which is bound to useFormState).
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setPillar("");
      setGqId("");
      setPhotoKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="auditId" value={auditId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pillar">Kategori 5R</Label>
          <select
            id="pillar"
            className={selectClass}
            value={pillar}
            onChange={(e) => {
              setPillar(e.target.value as Pillar);
              setGqId("");
            }}
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
            value={gqId}
            onChange={(e) => setGqId(e.target.value)}
            disabled={!pillar}
          >
            <option value="">
              {pillar ? "Pilih sub-kategori…" : "Pilih kategori dulu"}
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
          placeholder="mis. dekat pompa P-101"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi temuan</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Jelaskan ketidaksesuaian yang ditemukan…"
        />
      </div>

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
