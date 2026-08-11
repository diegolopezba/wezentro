import { useKeyboardAdjust } from "@/hooks/useKeyboardAdjust";

/**
 * Mounts the global visualViewport keyboard observer so the
 * `--keyboard-height` CSS variable is always available app-wide.
 */
export const KeyboardViewportObserver = () => {
  useKeyboardAdjust();
  return null;
};
