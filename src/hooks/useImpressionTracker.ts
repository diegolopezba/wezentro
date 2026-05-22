import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trackEventImpression } from "@/lib/analyticsTracking";

/**
 * Returns a ref to attach to a card element. When the element is at least
 * 50% visible for 500ms, fires a single impression event for the given eventId.
 */
export const useImpressionTracker = (eventId: string | undefined) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !user?.id || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const el = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (firedRef.current || timer) continue;
            timer = setTimeout(() => {
              if (!firedRef.current) {
                firedRef.current = true;
                trackEventImpression(eventId, user.id);
                observer.disconnect();
              }
              timer = null;
            }, 500);
          } else if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [eventId, user?.id]);

  return ref;
};
