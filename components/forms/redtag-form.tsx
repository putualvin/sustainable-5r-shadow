"use client";

import { useFormState, useFormStatus } from "react-dom";

import { createRedTag, type RedTagActionState } from "@/lib/actions/redtag";
import { CATEGORY_OPTIONS, LOCATION_OPTIONS } from "@/lib/redtag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoInput } from "@/components/forms/photo-input";

type Area = { id: string; code: string; name: string };

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function RedTagForm({
  areas,
  defaultAreaId,
  findingId,
}: {
  areas: Area[];
  defaultAreaId?: string | null;
  findingId?: string;
}) {
  const [state, formAction] = useFormState<RedTagActionState, FormData>(
    createRedTag,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {findingId && <input type="hidden" name="findingId" value={findingId} />}
      <div className="space-y-2">
        <Label htmlFor="areaId">Area</Label>
        <select
          id="areaId"
          name="areaId"
          defaultValue={defaultAreaId ?? ""}
          className={selectClass}
        >
          <option value="">Pilih area…</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} — {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nama Barang</Label>
        <Input id="name" name="name" placeholder="mis. Motor pompa rusak" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <select id="category" name="category" defaultValue="" className={selectClass}>
            <option value="">Pilih kategori…</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Lokasi Penyimpanan</Label>
          <select
            id="location"
            name="location"
            defaultValue="IN_AREA"
            className={selectClass}
          >
            {LOCATION_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Alasan</Label>
        <Textarea
          id="reason"
          name="reason"
          placeholder="Mengapa barang ini diberi red tag?"
        />
      </div>

      <div className="space-y-2">
        <Label>Foto (opsional)</Label>
        <PhotoInput name="photo" />
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
      {pending ? "Menyimpan…" : "Daftarkan Red Tag"}
    </Button>
  );
}
