import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to handle keyboard visibility and adjust UI accordingly on mobile.
 * Uses the visualViewport API for accurate keyboard height detection.
 * Prioritized for native Capacitor (iOS/Android) with browser PWA fallback.
 */
export const useKeyboardAdjust = () => {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    // Only run on mobile devices
    const isMobile = Capacitor.isNativePlatform() ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isMobile) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    // Use screen height as baseline — more stable than capturing viewport.height
    // at mount time which can be inaccurate on orientation change or late boot.
    const getBaselineHeight = () => {
      // On native Capacitor the screen height is reliable.
      // On browser, fall back to the largest seen viewport height.
      return Math.max(window.screen.height * 0.85, viewport.height);
    };

    let baselineHeight = getBaselineHeight();

    const handleResize = () => {
      const currentHeight = viewport.height;
      const heightDiff = baselineHeight - currentHeight;

      // Keyboard is considered visible if height difference > 100px
      const isKeyboardVisible = heightDiff > 100;

      setKeyboardState({
        isVisible: isKeyboardVisible,
        keyboardHeight: isKeyboardVisible ? heightDiff : 0,
      });

      // Scroll focused element into view when keyboard opens
      if (isKeyboardVisible && document.activeElement) {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
          setTimeout(() => {
            activeElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 100);
        }
      }
    };

    // Reset baseline on orientation change
    const handleOrientationChange = () => {
      setTimeout(() => {
        baselineHeight = getBaselineHeight();
        setKeyboardState({ isVisible: false, keyboardHeight: 0 });
      }, 350);
    };

    // When focus leaves an input and keyboard closes, reset baseline
    // This prevents drift when the viewport was never at full height at mount
    const handleFocusOut = () => {
      setTimeout(() => {
        if (!document.activeElement ||
          (document.activeElement.tagName !== "INPUT" &&
           document.activeElement.tagName !== "TEXTAREA")) {
          baselineHeight = getBaselineHeight();
        }
      }, 400);
    };

    viewport.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return keyboardState;
};

/**
 * CSS class helper to apply when keyboard is visible.
 * Reduces bottom padding to prevent content from being pushed off-screen.
 */
export const getKeyboardAdjustClass = (isKeyboardVisible: boolean): string => {
  return isKeyboardVisible ? "pb-4" : "pb-safe-bottom";
};
