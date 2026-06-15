"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Photo input that supports BOTH live camera capture AND gallery/file upload
// (mandatory: in flammable areas an external explosion-proof camera is used).
export function PhotoInput({ name }: { name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function openWith(capture: boolean) {
    const input = inputRef.current;
    if (!input) return;
    if (capture) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        onChange={onChange}
      />

      {preview ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Pratinjau foto"
            className="h-40 w-40 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={clear}
            aria-label="Hapus foto"
            className="absolute -right-2 -top-2 rounded-full bg-foreground/80 p-1 text-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith(true)}
            className="gap-2"
          >
            <Camera className="h-4 w-4" /> Kamera
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith(false)}
            className="gap-2"
          >
            <ImageUp className="h-4 w-4" /> Galeri
          </Button>
        </div>
      )}
    </div>
  );
}
