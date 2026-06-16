"use client";

import { useMemo } from "react";
import { useFormStatus } from "react-dom";

import { submitChecklist } from "@/lib/actions/checklist";
import { useLocalDraft } from "@/lib/use-local-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoInput } from "@/components/forms/photo-input";
import { cn } from "@/lib/utils";

type Item = { id: string; text: string };
type Defaults = Record<string, { compliant: boolean; note: string }>;
type Draft = {
  compliant: Record<string, boolean>;
  notes: Record<string, string>;
};

export function ChecklistForm({
  items,
  shift,
  defaults,
  storageKey,
}: {
  items: Item[];
  shift: number;
  defaults: Defaults;
  storageKey: string;
}) {
  // Draft persists locally (rule #7) so input survives reload / offline.
  const initial: Draft = {
    compliant: Object.fromEntries(
      items.map((i) => [i.id, defaults[i.id]?.compliant ?? true])
    ),
    notes: Object.fromEntries(items.map((i) => [i.id, defaults[i.id]?.note ?? ""])),
  };
  const [draft, setDraft, clearDraft] = useLocalDraft<Draft>(storageKey, initial);

  const compliantCount = useMemo(
    () => items.filter((i) => draft.compliant[i.id]).length,
    [items, draft.compliant]
  );
  const score = items.length
    ? Math.round((compliantCount / items.length) * 100)
    : 0;

  return (
    <form
      action={submitChecklist}
      onSubmit={() => clearDraft()}
      className="space-y-4"
    >
      <input type="hidden" name="shift" value={shift} />

      {/* Skor langsung */}
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur md:top-0">
        <span className="text-sm text-muted-foreground">
          Sesuai {compliantCount}/{items.length}
        </span>
        <span
          className={cn(
            "text-lg font-bold tabular-nums",
            score >= 90 ? "text-success" : "text-danger"
          )}
        >
          {score}%
        </span>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const ok = draft.compliant[item.id];
          return (
            <li key={item.id} className="rounded-lg border p-3">
              <p className="text-sm">{item.text}</p>
              <input
                type="hidden"
                name={`compliant_${item.id}`}
                value={ok ? "yes" : "no"}
              />
              <div className="mt-2 flex gap-2">
                <Toggle
                  active={ok}
                  tone="ok"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      compliant: { ...d.compliant, [item.id]: true },
                    }))
                  }
                >
                  Sesuai
                </Toggle>
                <Toggle
                  active={!ok}
                  tone="bad"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      compliant: { ...d.compliant, [item.id]: false },
                    }))
                  }
                >
                  Tidak Sesuai
                </Toggle>
              </div>

              {!ok && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <Input
                    name={`note_${item.id}`}
                    value={draft.notes[item.id] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        notes: { ...d.notes, [item.id]: e.target.value },
                      }))
                    }
                    placeholder="Catatan ketidaksesuaian"
                  />
                  <PhotoInput name={`photo_${item.id}`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <SubmitButton />
    </form>
  );
}

function Toggle({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "ok" | "bad";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeCls =
    tone === "ok"
      ? "border-success bg-success/10 text-success"
      : "border-danger bg-danger/10 text-danger";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 flex-1 rounded-md border text-sm font-medium transition-colors",
        active ? activeCls : "border-input text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full gap-2">
      {pending ? "Menyimpan…" : "Simpan Checklist"}
    </Button>
  );
}
