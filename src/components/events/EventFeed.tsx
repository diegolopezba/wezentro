import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { EventCard, EventCardProps } from "./EventCard";
import { useMasonryLayout, useElementWidth, type MasonryPosition } from "@/hooks/useMasonryLayout";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { EventFeedSkeleton } from "@/components/skeletons";
import { useTrackSponsoredImpression } from "@/hooks/useSponsoredPosts";
import { useAuth } from "@/contexts/AuthContext";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { trackEventImpression } from "@/lib/analyticsTracking";
import { useViewerFollowGraph, ViewerFollowGraph } from "@/hooks/useViewerFollowGraph";

interface EventFeedProps {
  events: EventCardProps[];
  isLoading?: boolean;
  emptyStateType?: "for-you" | "following";
  /** Called once the user scrolls past ~70% of the rendered feed. */
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const useFeedTracker = (userId: string | undefined) => {
  const entryTimestamps = useRef<Map<string, number>>(new Map());
  const trackedScrollPasts = useRef<Set<string>>(new Set());
  const trackedDwells = useRef<Set<string>>(new Set());
  const trackedImpressions = useRef<Set<string>>(new Set());
  const dwellTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const impressionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const observedNodes = useRef<Set<HTMLElement>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!userId) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const eventId = (entry.target as HTMLElement).dataset.eventId;
          if (!eventId) continue;

          const isMeaningfullyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;

          if (isMeaningfullyVisible) {
            // Dwell & ScrollPast tracking
            if (!entryTimestamps.current.has(eventId)) {
              entryTimestamps.current.set(eventId, Date.now());
            }
            if (!trackedDwells.current.has(eventId) && !dwellTimers.current.has(eventId)) {
              const timer = setTimeout(() => {
                trackedDwells.current.add(eventId);
                dwellTimers.current.delete(eventId);
                trackPreferenceSignal(userId, eventId, "dwell");
              }, 3000);
              dwellTimers.current.set(eventId, timer);
            }

            // Impression tracking (50% visible for 500ms)
            if (!trackedImpressions.current.has(eventId)) {
              if (!impressionTimers.current.has(eventId)) {
                const timer = setTimeout(() => {
                  if (!trackedImpressions.current.has(eventId)) {
                    trackedImpressions.current.add(eventId);
                    trackEventImpression(eventId, userId);
                  }
                }, 500);
                impressionTimers.current.set(eventId, timer);
              }
            }
          } else {
            // Cleanup dwell
            const dTimer = dwellTimers.current.get(eventId);
            if (dTimer) {
              clearTimeout(dTimer);
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

            // Cleanup impression
            const iTimer = impressionTimers.current.get(eventId);
            if (iTimer) {
              clearTimeout(iTimer);
              impressionTimers.current.delete(eventId);
            }
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    observedNodes.current.forEach((node) => observerRef.current?.observe(node));

    return () => {
      observerRef.current?.disconnect();
      dwellTimers.current.forEach((t) => clearTimeout(t));
      dwellTimers.current.clear();
      impressionTimers.current.forEach((t) => clearTimeout(t));
      impressionTimers.current.clear();
    };
  }, [userId]);

  const observeRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      observedNodes.current.add(node);
      observerRef.current?.observe(node);
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
  const { data: followGraph } = useViewerFollowGraph();
  const trackSponsoredImpression = useTrackSponsoredImpression();
  const trackedSponsoredIds = useRef<Set<string>>(new Set());
  const observeCard = useFeedTracker(user?.id);

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
      if (e.sponsoredPostId && !trackedSponsoredIds.current.has(e.sponsoredPostId)) {
        trackedSponsoredIds.current.add(e.sponsoredPostId);
        trackSponsoredImpression.mutate(e.sponsoredPostId);
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
      followGraph={followGraph}
      observeCard={observeCard}
      sentinelRef={sentinelRef}
      isLoadingMore={isLoadingMore}
    />
  );
};

const HORIZONTAL_GAP = 4;
const VERTICAL_GAP = 12;
const HORIZONTAL_PADDING = 4;

interface MasonryGridProps {
  events: EventCardProps[];
  followGraph?: ViewerFollowGraph;
  observeCard: (node: HTMLElement | null) => void;
  sentinelRef: React.MutableRefObject<HTMLDivElement | null>;
  isLoadingMore: boolean;
}

const MasonryGrid = ({ events, followGraph, observeCard, sentinelRef, isLoadingMore }: MasonryGridProps) => {
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

  const { positions, containerHeight, measureElement, isMeasured } = useMasonryLayout({
    items,
    containerWidth: Math.max(0, containerWidth - HORIZONTAL_PADDING * 2),
    columnCount,
    horizontalGap: HORIZONTAL_GAP,
    verticalGap: VERTICAL_GAP,
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
          paddingBottom: 88,
        }}
      >
        {events.map((event, index) => {
          const pos = positions.get(event.id);
          if (!pos) return null;
          return (
            <MasonryCardItem
              key={event.id}
              event={event}
              index={index}
              position={pos}
              isMeasured={isMeasured(event.id)}
              followGraph={followGraph}
              observeCard={observeCard}
              measureElement={measureElement}
              zIndex={events.length - index}
            />
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

interface MasonryCardItemProps {
  event: EventCardProps;
  index: number;
  position: MasonryPosition;
  isMeasured: boolean;
  followGraph?: ViewerFollowGraph;
  observeCard: (node: HTMLElement | null) => void;
  measureElement: (id: string, node: HTMLElement | null) => void;
  zIndex: number;
}

const MasonryCardItem = ({
  event,
  index,
  position,
  isMeasured,
  followGraph,
  observeCard,
  measureElement,
  zIndex,
}: MasonryCardItemProps) => {
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      observeCard(node);
      measureElement(event.id, node);
    },
    [event.id, measureElement, observeCard]
  );

  return (
    <div
      ref={setRef}
      data-event-id={event.id}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left + HORIZONTAL_PADDING,
        width: position.width,
        visibility: isMeasured ? "visible" : "hidden",
        zIndex,
      }}
    >
      <EventCard {...event} index={index} followGraph={followGraph} />
    </div>
  );
};

function getColumnCount(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}
