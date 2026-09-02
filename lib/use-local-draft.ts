"use client";

import { useEffect, useState } from "react";

// Persist form draft state to localStorage so in-progress input survives page
// reloads, forward/back navigation (business rule #8), and going offline
// (business rule #7). Returns a stateful value plus a clear() to drop the draft
// after a successful submit.
//
// `restored` is a state flag (not a ref) so the persist effect re-evaluates it
// AFTER restore has run — otherwise the first persist pass would write the
// initial value back over the saved draft.
export function useLocalDraft<T>(
  key: string,
  initial: T
): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(initial);
  const [restored, setRestored] = useState(false);

  // Restore once on mount (client only).
  useEffect(() => {
    let cancelled = false;
    let restoredValue: T | undefined;

    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) restoredValue = JSON.parse(raw) as T;
    } catch {
      // ignore malformed/unavailable storage
    }

    // Restore after the effect has finished so React does not perform a
    // synchronous cascading render from inside the effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      if (restoredValue !== undefined) setValue(restoredValue);
      setRestored(true);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  // Persist on change — but only after the restore pass has completed.
  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota/availability errors
    }
  }, [key, value, restored]);

  const clear = () => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return [value, setValue, clear];
}
