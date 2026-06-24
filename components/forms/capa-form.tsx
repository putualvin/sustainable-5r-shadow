"use client";

import { useFormState, useFormStatus } from "react-dom";

import { fillCapa, type CapaActionState } from "@/lib/actions/capa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoInput } from "@/components/forms/photo-input";

type Defaults = {
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  woScPoNumber: string;
  dueDate: string; // yyyy-MM-dd or ""
};

export function CapaForm({
  findingId,
  defaults,
}: {
  findingId: string;
  defaults: Defaults;
}) {
  const [state, formAction] = useFormState<CapaActionState, FormData>(
    fillCapa,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="findingId" value={findingId} />

      <div className="space-y-2">
        <Label htmlFor="rootCause">Akar Masalah (Root Cause)</Label>
        <Textarea
          id="rootCause"
          name="rootCause"
          defaultValue={defaults.rootCause}
          placeholder="Mengapa temuan ini terjadi?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="correctiveAction">Tindakan Korektif (Corrective)</Label>
        <Textarea
          id="correctiveAction"
          name="correctiveAction"
          defaultValue={defaults.correctiveAction}
          placeholder="Tindakan untuk memperbaiki kondisi saat ini."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preventiveAction">Tindakan Preventif (Preventive)</Label>
        <Textarea
          id="preventiveAction"
          name="preventiveAction"
          defaultValue={defaults.preventiveAction}
          placeholder="Tindakan agar temuan tidak terulang."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="woScPoNumber">No. WO / SC / PO</Label>
          <Input
            id="woScPoNumber"
            name="woScPoNumber"
            defaultValue={defaults.woScPoNumber}
            placeholder="mis. WO-2026-0456"
          />
          <p className="text-xs text-muted-foreground">
            Wajib bila Komite menetapkan status <strong>Progress</strong>.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Target Selesai (opsional)</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Foto Sesudah / After (opsional)</Label>
        <PhotoInput name="afterPhoto" />
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Status penyelesaian (Selesai / Proses / Belum Ada) ditetapkan oleh Komite
        Unit saat verifikasi — bukan diisi di sini.
      </p>

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
      {pending ? "Menyimpan…" : "Simpan CAPA"}
    </Button>
  );
}
