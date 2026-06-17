import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface MasonryItem {
  id: string;
  aspectRatio?: number | null; // width / height
}

export interface MasonryPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UseMasonryLayoutArgs {
  items: MasonryItem[];
  containerWidth: number;
  columnCount: number;
  horizontalGap: number;
  verticalGap: number;
  defaultAspectRatio?: number;
}

interface UseMasonryLayoutResult {
  positions: Map<string, MasonryPosition>;
  containerHeight: number;
  /** Stable ref callback — measures real height post-mount. */
  measureElement: (id: string, node: HTMLElement | null) => void;
  /** Whether the item's real DOM height has been measured at the current column width. */
  isMeasured: (id: string) => boolean;
}

export function useMasonryLayout({
  items,
  containerWidth,
  columnCount,
  horizontalGap,
  verticalGap,
  defaultAspectRatio = 0.8,
}: UseMasonryLayoutArgs): UseMasonryLayoutResult {
  const measuredHeights = useRef<Map<string, number>>(new Map());
  const [measureTick, setMeasureTick] = useState(0);

  const columnWidth = useMemo(() => {
    if (containerWidth <= 0 || columnCount <= 0) return 0;
    return (containerWidth - horizontalGap * (columnCount - 1)) / columnCount;
  }, [containerWidth, columnCount, horizontalGap]);

  // Clear measured heights when column width changes (e.g. window resize).
  // Must run as layout effect, not during render, to avoid side-effects
  // during render which can break React Strict Mode / concurrent rendering.
  useLayoutEffect(() => {
    if (columnWidth > 0) {
      measuredHeights.current = new Map();
    }
  }, [columnWidth]);

  const { positions, containerHeight } = useMemo(() => {
    const map = new Map<string, MasonryPosition>();
    if (columnWidth <= 0 || columnCount <= 0) {
      return { positions: map, containerHeight: 0 };
    }
    const colHeights = new Array(columnCount).fill(0);

    for (const item of items) {
      let colIdx = 0;
      let minH = colHeights[0];
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < minH) {
          minH = colHeights[i];
          colIdx = i;
        }
      }

      const measured = measuredHeights.current.get(item.id);
      const ratio =
        item.aspectRatio && item.aspectRatio > 0
          ? item.aspectRatio
          : defaultAspectRatio;
      const height = measured ?? columnWidth / ratio;

      const top = colHeights[colIdx];
      const left = colIdx * (columnWidth + horizontalGap);

      map.set(item.id, { top, left, width: columnWidth, height });
      colHeights[colIdx] = top + height + verticalGap;
    }

    const containerHeight = Math.max(0, ...colHeights) - (colHeights.length ? verticalGap : 0);
    return { positions: map, containerHeight };
  }, [items, columnWidth, columnCount, horizontalGap, verticalGap, defaultAspectRatio, measureTick]);

  const measureScheduled = useRef(false);
  const scheduleRelayout = useCallback(() => {
    if (measureScheduled.current) return;
    measureScheduled.current = true;
    requestAnimationFrame(() => {
      measureScheduled.current = false;
      setMeasureTick((t) => t + 1);
    });
  }, []);

  // Per-card ResizeObservers: card heights change as images/videos load,
  // so a one-shot ref measurement is not enough — without this, late-loading
  // media causes overlaps and gaps. We keep one observer per id and detach
  // it when the node is replaced/unmounted.
  const observers = useRef<Map<string, { observer: ResizeObserver; node: HTMLElement }>>(new Map());

  const recordHeight = useCallback(
    (id: string, real: number) => {
      if (real <= 0) return;
      const prev = measuredHeights.current.get(id);
      if (prev !== undefined && Math.abs(prev - real) < 1) return;
      measuredHeights.current.set(id, real);
      scheduleRelayout();
    },
    [scheduleRelayout]
  );

  const measureElement = useCallback(
    (id: string, node: HTMLElement | null) => {
      const existing = observers.current.get(id);
      if (existing && existing.node !== node) {
        existing.observer.disconnect();
        observers.current.delete(id);
      }
      if (!node) return;
      if (observers.current.has(id)) {
        // Same node: just refresh the measurement.
        recordHeight(id, node.getBoundingClientRect().height);
        return;
      }
      recordHeight(id, node.getBoundingClientRect().height);
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h = entry.contentRect.height;
          // Ignore zero readings (happens during unmount / display:none).
          if (h > 0) recordHeight(id, h);
        }
      });
      observer.observe(node);
      observers.current.set(id, { observer, node });
    },
    [recordHeight]
  );

  // Drop observers for ids that fell out of the items list (recycled).
  useEffect(() => {
    const live = new Set(items.map((it) => it.id));
    for (const [id, entry] of observers.current.entries()) {
      if (!live.has(id)) {
        entry.observer.disconnect();
        observers.current.delete(id);
        measuredHeights.current.delete(id);
      }
    }
  }, [items]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      for (const entry of observers.current.values()) entry.observer.disconnect();
      observers.current.clear();
    };
  }, []);

  const isMeasured = useCallback(
    (id: string) => measuredHeights.current.has(id),
    [measureTick]
  );

  return { positions, containerHeight, measureElement, isMeasured };
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = (entry.target as HTMLElement).clientWidth;
        if (w > 0) {
          setWidth((prev) => (Math.abs(prev - w) < 1 ? prev : w));
        }
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}
