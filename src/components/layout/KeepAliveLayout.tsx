import { useMemo, Suspense } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { KeepAlive } from "keepalive-for-react";
import { AnimatePresence, m } from "framer-motion";
import { RouteSkeleton } from "@/components/skeletons/RouteSkeleton";
import { useSwipeBack } from "@/hooks/useSwipeBack";

/**
 * KeepAliveLayout wraps routes to preserve their state and scroll position
 * when navigating away. This creates an Instagram/Pinterest-like experience
 * where returning to a page is instant with no loading or scroll jumps.
 *
 * Also mounts the global iOS-style edge swipe-back gesture so every page
 * gets navigate(-1) on a left-edge swipe.
 *
 * Wraps the active tab in a subtle crossfade using Apple's iOS push curve
 * so tab switches feel native rather than instantaneous DOM swaps.
 */
export const KeepAliveLayout = () => {
  const outlet = useOutlet();
  const location = useLocation();

  // Global swipe-back gesture (iOS-style edge swipe).
  useSwipeBack();

  // Use pathname as cache key for the 4 core navigation pages
  const currentCacheKey = useMemo(() => {
    return location.pathname;
  }, [location.pathname]);

  return (
    <KeepAlive activeCacheKey={currentCacheKey} max={2}>
      <Suspense fallback={<RouteSkeleton />}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={currentCacheKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
          >
            {outlet}
          </m.div>
        </AnimatePresence>
      </Suspense>
    </KeepAlive>
  );
};
