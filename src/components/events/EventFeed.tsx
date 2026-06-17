import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { EventCard, EventCardProps } from "./EventCard";
import { useMasonryLayout, useElementWidth } from "@/hooks/useMasonryLayout";
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
  /** Called once the user scrolls past ~70% of the rendered feed. */
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

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

export const EventFeed = ({
  events,
  isLoading = false,
  emptyStateType = "for-you",
  onEndReached,
  hasMore = false,
  isLoadingMore = false,
}: EventFeedProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const trackImpression = useTrackSponsoredImpression();
  const trackedIds = useRef<Set<string>>(new Set());
  const observeCard = useDwellTimeTracker(user?.id);

  // Dedicated sentinel element for infinite-scroll triggering. Sits as a
  // sibling of the grid so card refs never get reassigned mid-render —
  // same pattern Pinterest's MasonryInfinite uses.
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onEndReached || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onEndReached();
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [onEndReached, hasMore, events.length]);

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
    <MasonryGrid
      events={events}
      observeCard={observeCard}
      sentinelRef={sentinelRef}
      isLoadingMore={isLoadingMore}
    />
  );
};

const GAP = 4;
const HORIZONTAL_PADDING = 4; // matches old .masonry-grid padding

interface MasonryGridProps {
  events: EventCardProps[];
  observeCard: (node: HTMLElement | null) => void;
  sentinelRef: React.MutableRefObject<HTMLDivElement | null>;
  isLoadingMore: boolean;
}

const MasonryGrid = ({ events, observeCard, sentinelRef, isLoadingMore }: MasonryGridProps) => {
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>();
  const [columnCount, setColumnCount] = useState(() => getColumnCount(typeof window !== "undefined" ? window.innerWidth : 390));

  useEffect(() => {
    const update = () => setColumnCount(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const items = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        aspectRatio: e.media?.[0]?.aspect_ratio ?? null,
      })),
    [events]
  );

  const { positions, containerHeight, measureRef } = useMasonryLayout({
    items,
    containerWidth: Math.max(0, containerWidth - HORIZONTAL_PADDING * 2),
    columnCount,
    gap: GAP,
  });

  return (
    <>
      <div
        ref={containerRef}
        className="w-full"
        style={{
          position: "relative",
          height: containerHeight,
          paddingLeft: HORIZONTAL_PADDING,
          paddingRight: HORIZONTAL_PADDING,
        }}
      >
        {events.map((event, index) => {
          const pos = positions.get(event.id);
          if (!pos) return null;
          return (
            <div
              key={event.id}
              ref={(node) => {
                observeCard(node);
                measureRef(event.id)(node);
              }}
              data-event-id={event.id}
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left + HORIZONTAL_PADDING,
                width: pos.width,
              }}
            >
              <EventCard {...event} index={index} />
            </div>
          );
        })}
      </div>
      <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
      {isLoadingMore && (
        <div className="py-6 text-center text-muted-foreground text-sm">Cargando más…</div>
      )}
    </>
  );
};

function getColumnCount(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}
