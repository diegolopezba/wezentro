import { useCallback, useRef } from "react";

/**
 * Tracks whether a form has unsaved changes.
 *
 * Call `capture(values)` whenever the form is hydrated / reset (usually inside
 * the effect that seeds state from server data). `isDirty` is then true as soon
 * as the current values differ from that snapshot.
 */
export function useDirtyBaseline<T>(current: T) {
  const baseline = useRef<string | null>(null);

  const capture = useCallback((values: T) => {
    baseline.current = JSON.stringify(values);
  }, []);

  const isDirty =
    baseline.current !== null && JSON.stringify(current) !== baseline.current;

  return { isDirty, capture };
}

/** Save buttons stay muted until there is something to save. */
export const saveVariant = (isDirty: boolean) => (isDirty ? "save" : "default") as const;
