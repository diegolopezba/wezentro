import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trackEventImpression } from "@/lib/analyticsTracking";

interface ImpressionOptions {
  /** Creator of the post — used to exclude self-views (IG/TikTok behavior). */
  creatorId?: string | null;
  /** Media type. Video fires on playback start; image fires on 50%/500ms visibility. */
  mediaType?: "image" | "video";
  /** Disable tracking (e.g. sponsored posts handled elsewhere). */
  disabled?: boolean;
}

/** Min ms between re-fires within a single mount. Bumped to 5min — the
 *  persistent client queue already dedupes per day, so anything tighter is
 *  wasted work. */
const REPEAT_THROTTLE_MS = 5 * 60_000;


/**
 * Mirrors Instagram/TikTok view counting:
 * - Video: fires on playback start (call returned `notifyPlay`).
 * - Image/carousel: fires when ≥50% visible for 500ms.
 * - Excludes the creator's own views.
 * - Counts logged-out viewers (user_id null).
 * - Repeats allowed across mounts; throttled to 30s within a single mount.
 */
export const useImpressionTracker = (
  eventId: string | undefined,
  options: ImpressionOptions = {}
) => {
  const { creatorId, mediaType = "image", disabled = false } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const lastFiredAtRef = useRef(0);

  const isSelfView = !!user?.id && !!creatorId && user.id === creatorId;
  const skip = disabled || !eventId || isSelfView;

  const fire = useCallback(() => {
    if (!eventId) return;
    const now = Date.now();
    if (now - lastFiredAtRef.current < REPEAT_THROTTLE_MS) return;
    lastFiredAtRef.current = now;
    trackEventImpression(eventId, user?.id ?? null);
  }, [eventId, user?.id]);

  // Reset throttle when card identity changes.
  useEffect(() => {
    lastFiredAtRef.current = 0;
  }, [eventId]);

  // Image / carousel path: visibility-based.
  useEffect(() => {
    if (skip || mediaType === "video") return;
    if (!ref.current || typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const el = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (timer) continue;
            timer = setTimeout(() => {
              fire();
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
  }, [skip, mediaType, fire]);

  /** Call this when the active video starts playing. */
  const notifyPlay = useCallback(() => {
    if (skip) return;
    fire();
  }, [skip, fire]);

  return { ref, notifyPlay };
};
