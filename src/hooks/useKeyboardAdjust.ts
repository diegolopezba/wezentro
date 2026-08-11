import { useEffect, useState } from "react";

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

let listenerCount = 0;
const subscribers = new Set<(s: KeyboardState) => void>();
let currentState: KeyboardState = { isVisible: false, keyboardHeight: 0 };
let detach: (() => void) | null = null;

const setKeyboardVar = (height: number) => {
  document.documentElement.style.setProperty("--keyboard-height", `${height}px`);
  if (height > 0) {
    document.documentElement.setAttribute("data-keyboard", "open");
  } else {
    document.documentElement.removeAttribute("data-keyboard");
  }
};

const attach = () => {
  const viewport = window.visualViewport;
  if (!viewport) return;

  const update = () => {
    // Layout viewport height minus the visible (visual) viewport bottom edge.
    // With `interactive-widget=resizes-visual` the layout viewport never
    // shrinks, so this difference is exactly the keyboard height.
    const raw = window.innerHeight - (viewport.height + viewport.offsetTop);
    const height = raw > 80 ? Math.round(raw) : 0;

    if (height === currentState.keyboardHeight) return;
    currentState = { isVisible: height > 0, keyboardHeight: height };
    setKeyboardVar(height);
    subscribers.forEach((fn) => fn(currentState));
  };

  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  update();

  detach = () => {
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
    setKeyboardVar(0);
    currentState = { isVisible: false, keyboardHeight: 0 };
  };
};

/**
 * Tracks the on-screen keyboard using the visualViewport API.
 *
 * The layout viewport is never resized (see `interactive-widget=resizes-visual`
 * in index.html and `Keyboard.resize: 'none'` in capacitor.config.ts), so the
 * page behind stays perfectly still. Components lift themselves above the
 * keyboard with the `--keyboard-height` CSS variable exposed here — a
 * compositor-only transform, exactly how Instagram's composer behaves.
 */
export const useKeyboardAdjust = (): KeyboardState => {
  const [state, setState] = useState<KeyboardState>(currentState);

  useEffect(() => {
    subscribers.add(setState);
    listenerCount += 1;
    if (listenerCount === 1) attach();
    setState(currentState);

    return () => {
      subscribers.delete(setState);
      listenerCount -= 1;
      if (listenerCount === 0 && detach) {
        detach();
        detach = null;
      }
    };
  }, []);

  return state;
};

/**
 * CSS class helper to apply when keyboard is visible.
 * Reduces bottom padding to prevent content from being pushed off-screen.
 */
export const getKeyboardAdjustClass = (isKeyboardVisible: boolean): string => {
  return isKeyboardVisible ? "pb-4" : "pb-safe-bottom";
};
