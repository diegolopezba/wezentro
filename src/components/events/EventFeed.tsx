import { useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

            if (!trackedDwells.current.has(eventId)) {
              const timer = setTimeout(() => {
                trackedDwells.current.add(eventId);
                trackPreferenceSignal(userId, eventId, "dwell");
              }, 3000);
              dwellTimers.current.set(eventId, timer);
            }
          } else {
            const timer = dwellTimers.current.get(eventId);
            if (timer) {
              clearTimeout(timer);
              dwellTimers.current.delete(eventId);
            }

            const enterTime = entryTimestamps.current.get(eventId);
            if (enterTime) {
              const dwellMs = Date.now() - enterTime;
              entryTimestamps.current.delete(eventId);

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

/**
 * Split events into two columns for masonry layout (used by virtualizer).
 * Returns an array of rows, where each row has [leftEvent, rightEvent?].
 */
const buildMasonryRows = (events: EventCardProps[]): [EventCardProps, EventCardProps | undefined][] => {
  const rows: [EventCardProps, EventCardProps | undefined][] = [];
  for (let i = 0; i < events.length; i += 2) {
    rows.push([events[i], events[i + 1]]);
  }
  return rows;
};

export const EventFeed = ({ events, isLoading = false, emptyStateType = "for-you" }: EventFeedProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const trackImpression = useTrackSponsoredImpression();
  const trackedIds = useRef<Set<string>>(new Set());
  const observeCard = useDwellTimeTracker(user?.id);
  const parentRef = useRef<HTMLDivElement>(null);

  // Track impressions for sponsored posts
  useEffect(() => {
    const sponsoredEvents = events.filter(e => e.isSponsored && e.sponsoredPostId);
    sponsoredEvents.forEach(e => {
      if (e.sponsoredPostId && !trackedIds.current.has(e.sponsoredPostId)) {
        trackedIds.current.add(e.sponsoredPostId);
        trackImpression.mutate(e.sponsoredPostId);
      }
    });
  }, [events]);

  const rows = buildMasonryRows(events);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => {
      // Walk up to find the scrollable AppLayout container
      let el = parentRef.current?.parentElement;
      while (el) {
        if (el.scrollHeight > el.clientHeight) return el;
        el = el.parentElement;
      }
      return null;
    },
    estimateSize: () => 280,
    overscan: 3,
  });

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
    <div ref={parentRef}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const [left, right] = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 gap-3 px-4">
                <div ref={observeCard} data-event-id={left.id}>
                  <EventCard {...left} index={virtualRow.index * 2} />
                </div>
                {right && (
                  <div ref={observeCard} data-event-id={right.id}>
                    <EventCard {...right} index={virtualRow.index * 2 + 1} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
