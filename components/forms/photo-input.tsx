"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

// Resize an image file to a JPEG data URL (max edge ~1280px). Keeps payloads
// small enough to store in the DB and avoids any filesystem write (serverless).
function fileToDataUrl(file: File, maxDim = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas context");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("gagal memuat gambar"));
    };
    img.src = url;
  });
}

// Photo input that supports BOTH live camera capture AND gallery/file upload.
// The selected image is resized to a data URL and submitted via a hidden field.
export function PhotoInput({ name }: { name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openWith(capture: boolean) {
    const input = inputRef.current;
    if (!input) return;
    if (capture) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setData(dataUrl);
    } catch {
      setError("Gagal memproses gambar. Coba foto lain.");
      setData("");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setData("");
    setError(null);
  }

  return (
    <div className="space-y-2">
      {/* Resized image submitted as text; the file input is only for picking. */}
      <input type="hidden" name={name} value={data} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onChange}
      />

      {busy ? (
        <div className="flex h-40 w-40 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : data ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data}
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
          <Button type="button" variant="outline" size="sm" onClick={() => openWith(true)} className="gap-2">
            <Camera className="h-4 w-4" /> Kamera
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => openWith(false)} className="gap-2">
            <ImageUp className="h-4 w-4" /> Galeri
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
