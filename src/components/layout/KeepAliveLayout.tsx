import { useMemo, Suspense } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { KeepAlive } from "keepalive-for-react";
import { PageLoader } from "@/components/PageLoader";

/**
 * KeepAliveLayout wraps routes to preserve their state and scroll position
 * when navigating away. This creates an Instagram/Pinterest-like experience
 * where returning to a page is instant with no loading or scroll jumps.
 */
export const KeepAliveLayout = () => {
  const outlet = useOutlet();
  const location = useLocation();

  // Use pathname as cache key for the 4 core navigation pages
  const currentCacheKey = useMemo(() => {
    return location.pathname;
  }, [location.pathname]);

  return (
    <KeepAlive activeCacheKey={currentCacheKey} max={4}>
      <Suspense fallback={<PageLoader />}>
        {outlet}
      </Suspense>
    </KeepAlive>
  );
};
