import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to handle keyboard visibility and adjust UI accordingly on mobile.
 * Uses the visualViewport API for accurate keyboard height detection.
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

    let initialHeight = viewport.height;

    const handleResize = () => {
      const currentHeight = viewport.height;
      const heightDiff = initialHeight - currentHeight;
      
      // Keyboard is considered visible if height difference > 100px
      const isKeyboardVisible = heightDiff > 100;
      
      setKeyboardState({
        isVisible: isKeyboardVisible,
        keyboardHeight: isKeyboardVisible ? heightDiff : 0,
      });

      // Scroll focused element into view when keyboard opens
      if (isKeyboardVisible && document.activeElement) {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
          setTimeout(() => {
            activeElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 100);
        }
      }
    };

    // Update initial height on orientation change
    const handleOrientationChange = () => {
      setTimeout(() => {
        initialHeight = viewport.height;
      }, 300);
    };

    viewport.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return keyboardState;
};

/**
 * CSS class helper to apply when keyboard is visible.
 * Reduces bottom padding to prevent content from being pushed off-screen.
 */
export const getKeyboardAdjustClass = (isKeyboardVisible: boolean): string => {
  return isKeyboardVisible ? 'pb-4' : 'pb-safe-bottom';
};
