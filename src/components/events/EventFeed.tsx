import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { EventCard, EventCardProps } from "./EventCard";
import { useMasonryLayout, useElementWidth, type MasonryPosition } from "@/hooks/useMasonryLayout";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { EventFeedSkeleton } from "@/components/skeletons";
import { useTrackSponsoredImpression } from "@/hooks/useSponsoredPosts";
import { useAuth } from "@/contexts/AuthContext";

import { trackEventImpression } from "@/lib/analyticsTracking";
import { useViewerFollowGraph, type ViewerFollowGraph } from "@/hooks/useViewerFollowGraph";

interface EventFeedProps {
  events: EventCardProps[];
  isLoading?: boolean;
  emptyStateType?: "for-you" | "following";
  /** Called once the user scrolls past ~70% of the rendered feed. */
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

// Feed-level impression tracker. Dwell/scroll_past signals were removed
// (Pinterest/TikTok drop them too — sub-second signals don't justify the
// cost). Only batched impressions are tracked, via `impressionQueue`.
const useFeedTracker = (userId: string | undefined) => {
  const trackedImpressions = useRef<Set<string>>(new Set());
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
            if (!trackedImpressions.current.has(eventId) && !impressionTimers.current.has(eventId)) {
              const timer = setTimeout(() => {
                if (!trackedImpressions.current.has(eventId)) {
                  trackedImpressions.current.add(eventId);
                  trackEventImpression(eventId, userId);
                }
              }, 500);
              impressionTimers.current.set(eventId, timer);
            }
          } else {
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

  const unobserveRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    observerRef.current?.unobserve(node);
    observedNodes.current.delete(node);
  }, []);

  return { observeCard: observeRef, unobserveCard: unobserveRef };
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
  const { observeCard, unobserveCard } = useFeedTracker(user?.id);

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
      unobserveCard={unobserveCard}
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
  unobserveCard: (node: HTMLElement | null) => void;
  sentinelRef: React.MutableRefObject<HTMLDivElement | null>;
  isLoadingMore: boolean;
}

// Overscan window above/below viewport (in px). ~1.5 viewports keeps scroll
// buttery on flings while capping mounted DOM to a small constant, à la
// Pinterest/Instagram virtualized feeds.
// Overscan window above/below the viewport (in px). Roughly one viewport is
// enough to hide fling latency while keeping mounted DOM to a small constant,
// à la Pinterest/Instagram virtualized feeds.
const OVERSCAN_PX = 900;

const MasonryGrid = ({ events, followGraph, observeCard, unobserveCard, sentinelRef, isLoadingMore }: MasonryGridProps) => {
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

  // Virtualization window: [visibleTop, visibleBottom] in container-local px.
  // The document is the app's single scroll owner, so we always track window
  // scroll — walking for a "scroll parent" resolved inconsistently and left
  // the window frozen, which meant cards never unmounted.
  const [visible, setVisible] = useState<{ top: number; bottom: number }>({
    top: 0,
    bottom: typeof window !== "undefined" ? window.innerHeight : 1000,
  });

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    let raf: number | null = null;

    const compute = () => {
      raf = null;
      const rect = containerEl.getBoundingClientRect();
      // container-local coord: 0 = top of container.
      const top = -rect.top;
      const bottom = top + window.innerHeight;
      setVisible((prev) => {
        if (Math.abs(prev.top - top) < 50 && Math.abs(prev.bottom - bottom) < 50) {
          return prev;
        }
        return { top, bottom };
      });
    };

    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [containerRef, containerHeight]);

  const windowTop = visible.top - OVERSCAN_PX;
  const windowBottom = visible.bottom + OVERSCAN_PX;

  return (
    <>
      <div
        ref={containerRef}
        className="w-full"
        style={{
          position: "relative",
          isolation: "isolate",
          height: containerHeight,
          paddingLeft: HORIZONTAL_PADDING,
          paddingRight: HORIZONTAL_PADDING,
          paddingBottom: 88,
        }}
      >
        {events.map((event, index) => {
          const pos = positions.get(event.id);
          if (!pos) return null;
          // Skip cards fully outside the overscan window — including
          // unmeasured ones, which sit at their estimated aspect-ratio height
          // until they scroll in. Force-rendering every unmeasured card meant
          // a whole freshly-fetched page mounted at once.
          const measured = isMeasured(event.id);
          const cardBottom = pos.top + pos.height;
          if (cardBottom < windowTop || pos.top > windowBottom) {
            return null;
          }
          return (
            <MasonryCardItem
              key={event.id}
              event={event}
              index={index}
              position={pos}
              isMeasured={measured}
              followGraph={followGraph}
              observeCard={observeCard}
              unobserveCard={unobserveCard}
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
  unobserveCard: (node: HTMLElement | null) => void;
  measureElement: (id: string, node: HTMLElement | null) => void;
  zIndex: number;
}

const MasonryCardItemBase = ({
  event,
  index,
  position,
  isMeasured,
  followGraph,
  observeCard,
  unobserveCard,
  measureElement,
  zIndex,
}: MasonryCardItemProps) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (nodeRef.current && nodeRef.current !== node) {
        unobserveCard(nodeRef.current);
      }
      nodeRef.current = node;
      if (!node) return;
      observeCard(node);
      measureElement(event.id, node);
    },
    [event.id, measureElement, observeCard, unobserveCard]
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

/**
 * A single card measurement rebuilds every position object, so without this
 * memo one image finishing load re-rendered every mounted card (quadratic
 * work as the feed grew). Only re-render when this card's own geometry or
 * data changed.
 */
const MasonryCardItem = memo(MasonryCardItemBase, (prev, next) => {
  return (
    prev.event === next.event &&
    prev.index === next.index &&
    prev.isMeasured === next.isMeasured &&
    prev.zIndex === next.zIndex &&
    prev.followGraph === next.followGraph &&
    prev.position.top === next.position.top &&
    prev.position.left === next.position.left &&
    prev.position.width === next.position.width &&
    prev.observeCard === next.observeCard &&
    prev.unobserveCard === next.unobserveCard &&
    prev.measureElement === next.measureElement
  );
});

function getColumnCount(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}
