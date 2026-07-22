import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

interface UseSwipeBackOptions {
  threshold?: number;
  edgeWidth?: number;
}

// Routes that are root-level tabs — swipe-back should be a no-op here.
const ROOT_ROUTES = new Set(["/", "/discover", "/create", "/notifications", "/profile"]);

export const useSwipeBack = (options: UseSwipeBackOptions = {}) => {
  const { threshold = 60, edgeWidth = 24 } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);
  const hasHapticFired = useRef(false);

  useEffect(() => {
    if (ROOT_ROUTES.has(location.pathname)) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= edgeWidth) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        isEdgeSwipe.current = true;
        hasHapticFired.current = false;
      } else {
        isEdgeSwipe.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeSwipe.current || touchStartX.current === null) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      // Cue that the gesture will commit — fire once when past threshold.
      if (!hasHapticFired.current && deltaX > threshold) {
        haptic("light");
        hasHapticFired.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe.current || touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      if (deltaX > threshold && deltaX > deltaY * 2) {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/");
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isEdgeSwipe.current = false;
      hasHapticFired.current = false;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate, threshold, edgeWidth, location.pathname]);
};
