import { useState, useRef, useCallback, ReactNode } from "react";
import { m, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

const atDocumentTop = () =>
  (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

/**
 * Pull-to-refresh for the page feed.
 *
 * The document is the scroll owner — this component is only a positioning
 * wrapper. It never creates its own scroll container and never intercepts a
 * touch move unless the page is genuinely at the very top and the finger is
 * moving down, so ordinary scrolling on Android is left completely untouched.
 */
export const PullToRefresh = ({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className = "",
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const thresholdReached = useRef(false);

  const pullDistance = useMotionValue(0);
  const rotation = useTransform(pullDistance, [0, threshold], [0, 180]);
  const opacity = useTransform(pullDistance, [0, threshold / 2, threshold], [0, 0.5, 1]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (!atDocumentTop()) return;
      startY.current = e.touches[0].clientY;
      thresholdReached.current = false;
      setIsPulling(true);
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      // Left the top of the page (normal scroll): bail out entirely and let
      // the browser own the gesture.
      if (!atDocumentTop()) {
        setIsPulling(false);
        pullDistance.set(0);
        return;
      }

      const diff = e.touches[0].clientY - startY.current;

      // Upward movement is a normal scroll — release the gesture.
      if (diff <= 0) {
        setIsPulling(false);
        pullDistance.set(0);
        return;
      }

      const distance = Math.min(diff * 0.5, threshold * 1.5);
      pullDistance.set(distance);

      if (!thresholdReached.current && distance >= threshold) {
        haptic("light");
        thresholdReached.current = true;
      } else if (thresholdReached.current && distance < threshold) {
        thresholdReached.current = false;
      }

      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    },
    [isPulling, disabled, isRefreshing, threshold, pullDistance],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);
    const distance = pullDistance.get();

    if (distance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      pullDistance.set(threshold);
      haptic("medium");

      try {
        await onRefresh();
        haptic("success");
      } finally {
        setIsRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [isPulling, disabled, isRefreshing, threshold, pullDistance, onRefresh]);

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <m.div
            className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
            style={{
              top: 0,
              height: pullDistance,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <m.div
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              style={{ opacity }}
            >
              <m.div
                style={{ rotate: isRefreshing ? undefined : rotation }}
                animate={isRefreshing ? { rotate: 360 } : undefined}
                transition={
                  isRefreshing
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : undefined
                }
              >
                <RefreshCw className="w-5 h-5 text-foreground" />
              </m.div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Content with pull offset */}
      <m.div
        style={{
          y: isPulling || isRefreshing ? pullDistance : 0,
          transition: isPulling ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </m.div>
    </div>
  );
};
