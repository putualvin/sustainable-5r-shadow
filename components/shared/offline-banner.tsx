"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Global connectivity banner (business rule #7). When the browser goes offline,
// a sticky banner tells the user their input is kept locally and will sync.
// Audit-input and checklist forms persist drafts to localStorage (see
// useLocalDraft), so data entered offline is not lost.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-white"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      Mode offline — data akan disinkronkan saat kembali daring.
    </div>
  );
}
