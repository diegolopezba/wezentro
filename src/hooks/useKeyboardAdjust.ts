import { useEffect, useState } from "react";

export interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
  viewportHeight: number;
  viewportOffsetTop: number;
}

export const calculateKeyboardState = ({
  layoutHeight,
  visualHeight,
  offsetTop,
  hasFocusedInput,
  wasVisible,
}: {
  layoutHeight: number;
  visualHeight: number;
  offsetTop: number;
  hasFocusedInput: boolean;
  wasVisible: boolean;
}): KeyboardState => {
  const rawHeight = layoutHeight - (visualHeight + offsetTop);
  const keyboardHeight = (hasFocusedInput || wasVisible) && rawHeight > 80 ? Math.round(rawHeight) : 0;
  return {
    isVisible: keyboardHeight > 0,
    keyboardHeight,
    viewportHeight: Math.round(visualHeight),
    viewportOffsetTop: Math.round(offsetTop),
  };
};

let listenerCount = 0;
const subscribers = new Set<(s: KeyboardState) => void>();
let currentState: KeyboardState = {
  isVisible: false,
  keyboardHeight: 0,
  viewportHeight: 0,
  viewportOffsetTop: 0,
};
let detach: (() => void) | null = null;

const isKeyboardInput = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLTextAreaElement || element.isContentEditable) return true;
  if (!(element instanceof HTMLInputElement)) return false;
  return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(
    element.type,
  );
};

const setViewportVars = (state: KeyboardState) => {
  const root = document.documentElement;
  root.style.setProperty("--keyboard-height", `${state.keyboardHeight}px`);
  root.style.setProperty("--visual-viewport-height", `${state.viewportHeight}px`);
  root.style.setProperty("--visual-viewport-offset-top", `${state.viewportOffsetTop}px`);
  if (state.isVisible) {
    document.documentElement.setAttribute("data-keyboard", "open");
  } else {
    document.documentElement.removeAttribute("data-keyboard");
  }
};

const attach = () => {
  const viewport = window.visualViewport;
  if (!viewport) return;
  let frame = 0;
  let stableLayoutHeight = Math.max(window.innerHeight, viewport.height);

  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const focusedInput = isKeyboardInput(document.activeElement);
      if (!focusedInput) stableLayoutHeight = Math.max(stableLayoutHeight, window.innerHeight, viewport.height);

      const nextState = calculateKeyboardState({
        layoutHeight: stableLayoutHeight,
        visualHeight: viewport.height,
        offsetTop: viewport.offsetTop,
        hasFocusedInput: focusedInput,
        wasVisible: currentState.isVisible,
      });

      if (
        nextState.keyboardHeight === currentState.keyboardHeight &&
        nextState.viewportHeight === currentState.viewportHeight &&
        nextState.viewportOffsetTop === currentState.viewportOffsetTop
      ) return;

      currentState = nextState;
      setViewportVars(currentState);
      subscribers.forEach((fn) => fn(currentState));
    });
  };

  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  window.addEventListener("focusin", update);
  window.addEventListener("focusout", update);
  window.addEventListener("orientationchange", update);
  update();

  detach = () => {
    cancelAnimationFrame(frame);
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
    window.removeEventListener("focusin", update);
    window.removeEventListener("focusout", update);
    window.removeEventListener("orientationchange", update);
    currentState = {
      isVisible: false,
      keyboardHeight: 0,
      viewportHeight: Math.round(viewport.height),
      viewportOffsetTop: Math.round(viewport.offsetTop),
    };
    setViewportVars(currentState);
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
