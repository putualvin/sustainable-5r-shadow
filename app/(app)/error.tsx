"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

// Error boundary for authenticated routes. Friendly Bahasa message + retry.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Dev/log output stays in English.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
        <p className="text-sm text-muted-foreground">
          Maaf, halaman ini gagal dimuat. Silakan coba lagi.
        </p>
      </div>
      <Button onClick={reset} className="gap-2">
        Coba lagi
      </Button>
    </div>
  );
}
