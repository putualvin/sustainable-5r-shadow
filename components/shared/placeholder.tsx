import { Construction } from "lucide-react";

// Generic placeholder for modules not yet built (Module 0 navigation targets).
export function Placeholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/50 p-12 text-center">
        <Construction className="h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Modul ini sedang dalam pengembangan</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {description ??
            "Fitur ini akan dibangun pada tahap berikutnya sesuai roadmap."}
        </p>
      </div>
    </div>
  );
}
