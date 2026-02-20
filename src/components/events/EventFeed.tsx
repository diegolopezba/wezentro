import { useEffect, useRef, useCallback } from "react";
import { EventCard, EventCardProps } from "./EventCard";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { EventFeedSkeleton } from "@/components/skeletons";
import { useTrackSponsoredImpression } from "@/hooks/useSponsoredPosts";
import { useAuth } from "@/contexts/AuthContext";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";

interface EventFeedProps {
  events: EventCardProps[];
  isLoading?: boolean;
  emptyStateType?: "for-you" | "following";
}

/**
 * Dwell-time tracker: uses IntersectionObserver to detect when a card
 * enters the viewport. If the card is visible for < 1 s and then leaves,
 * we fire a "scroll_past" signal (mild negative).
 */
const useDwellTimeTracker = (userId: string | undefined) => {
  const entryTimestamps = useRef<Map<string, number>>(new Map());
  const trackedScrollPasts = useRef<Set<string>>(new Set());
  const trackedDwells = useRef<Set<string>>(new Set());
  const dwellTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!userId) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const eventId = (entry.target as HTMLElement).dataset.eventId;
          if (!eventId) continue;

          if (entry.isIntersecting) {
            entryTimestamps.current.set(eventId, Date.now());

            // Start a 3s timer for positive dwell signal
            if (!trackedDwells.current.has(eventId)) {
              const timer = setTimeout(() => {
                trackedDwells.current.add(eventId);
                trackPreferenceSignal(userId, eventId, "dwell");
              }, 3000);
              dwellTimers.current.set(eventId, timer);
            }
          } else {
            // Card left viewport — clear dwell timer
            const timer = dwellTimers.current.get(eventId);
            if (timer) {
              clearTimeout(timer);
              dwellTimers.current.delete(eventId);
            }

            const enterTime = entryTimestamps.current.get(eventId);
            if (enterTime) {
              const dwellMs = Date.now() - enterTime;
              entryTimestamps.current.delete(eventId);

              // If visible < 1s → scroll_past (fire once per event)
              if (dwellMs < 1000 && !trackedScrollPasts.current.has(eventId)) {
                trackedScrollPasts.current.add(eventId);
                trackPreferenceSignal(userId, eventId, "scroll_past");
              }
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    return () => {
      observerRef.current?.disconnect();
      // Clear all pending dwell timers
      dwellTimers.current.forEach((t) => clearTimeout(t));
      dwellTimers.current.clear();
    };
  }, [userId]);

  const observeRef = useCallback(
    (node: HTMLElement | null) => {
      if (node && observerRef.current) {
        observerRef.current.observe(node);
      }
    },
    []
  );

  return observeRef;
};

export const EventFeed = ({ events, isLoading = false, emptyStateType = "for-you" }: EventFeedProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const trackImpression = useTrackSponsoredImpression();
  const trackedIds = useRef<Set<string>>(new Set());
  const observeCard = useDwellTimeTracker(user?.id);

  // Track impressions for sponsored posts when they appear in the feed
  useEffect(() => {
    const sponsoredEvents = events.filter(e => e.isSponsored && e.sponsoredPostId);
    sponsoredEvents.forEach(e => {
      if (e.sponsoredPostId && !trackedIds.current.has(e.sponsoredPostId)) {
        trackedIds.current.add(e.sponsoredPostId);
        trackImpression.mutate(e.sponsoredPostId);
      }
    });
  }, [events]);

  if (isLoading) {
    return <EventFeedSkeleton count={6} />;
  }

  if (events.length === 0) {
    if (emptyStateType === "following") {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
            Sin eventos de personas que sigues
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-4">
            Sigue a creadores para ver sus eventos aquí. ¡Descubre nuevas personas en la pestaña Para Ti!
          </p>
          <Button variant="secondary" onClick={() => navigate("/discover")}>
            Descubrir Eventos
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-3xl">🌙</span>
        </div>
        <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
          No se encontraron eventos
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          No hay eventos que coincidan con tu búsqueda ahora mismo. ¡Vuelve más tarde!
        </p>
      </div>
    );
  }

  return (
    <div className="masonry-grid">
      {events.map((event, index) => (
        <div key={event.id} ref={observeCard} data-event-id={event.id}>
          <EventCard {...event} index={index} />
        </div>
      ))}
    </div>
  );
};
