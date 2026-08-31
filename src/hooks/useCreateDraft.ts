import { useEffect, useRef } from "react";

const KEY = "zentro:create-draft:v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

export type CreateDraft = Record<string, unknown>;

export function readCreateDraft<T extends CreateDraft>(): T | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: T };
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function clearCreateDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Debounced persistence of the Create page draft (text fields only —
 * media files can't be serialized and must be re-added).
 */
export function usePersistCreateDraft(data: CreateDraft, enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        /* quota — ignore */
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [data, enabled]);
}
