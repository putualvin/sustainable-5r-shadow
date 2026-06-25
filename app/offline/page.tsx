import { WifiOff } from "lucide-react";

// Shown by the service worker when a page is requested with no connection and
// no cached copy is available. Static — needs no data or auth.
export const metadata = { title: "Offline — Sustainable 5R" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
        5R
      </span>
      <WifiOff className="h-8 w-8 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-bold">Sedang Offline</h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Tidak ada koneksi internet. Halaman yang pernah dibuka tetap bisa
          dilihat; data terbaru akan tersinkron saat koneksi kembali.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Coba lagi setelah sinyal tersedia.
      </p>
    </main>
  );
}
