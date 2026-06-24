// Generic loading skeleton shown during route transitions (App Router
// loading.tsx). Mirrors the common header + KPI row + content card layout.
export function PageSkeleton() {
  return (
    <div className="max-w-6xl animate-pulse space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-muted/40" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border bg-muted/40" />
        ))}
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
