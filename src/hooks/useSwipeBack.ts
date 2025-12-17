import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface UseSwipeBackOptions {
  threshold?: number;
  edgeWidth?: number;
}

export const useSwipeBack = (options: UseSwipeBackOptions = {}) => {
  const { threshold = 100, edgeWidth = 30 } = options;
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger if swipe starts from the left edge
      if (touch.clientX <= edgeWidth) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        isEdgeSwipe.current = true;
      } else {
        isEdgeSwipe.current = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe.current || touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Check if horizontal swipe is dominant and exceeds threshold
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
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate, threshold, edgeWidth]);
};
