import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldX className="h-16 w-16 text-danger" />
      <div>
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="mt-1 text-muted-foreground">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Kembali ke Beranda</Link>
      </Button>
    </main>
  );
}
