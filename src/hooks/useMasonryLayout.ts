import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  /** Ref callback for each item — measures real height post-mount. */
  measureRef: (id: string) => (node: HTMLDivElement | null) => void;
  /** Whether the item's real DOM height has been measured at the current column width. */
  isMeasured: (id: string) => boolean;
}

/**
 * Pinterest-style absolute-positioned masonry.
 *
 * - Items placed in array order into the currently shortest column.
 * - Heights come from item.aspectRatio (width/height); fall back to defaultAspectRatio.
 * - After mount, real DOM heights are measured per item and cached per
 *   (columnWidth, id). Layout re-runs only when something actually shifts.
 * - Existing items' positions never change on append → no reflow, no
 *   <video> remount, no animation replay (fixes right-column glitch).
 */
export function useMasonryLayout({
  items,
  containerWidth,
  columnCount,
  horizontalGap,
  verticalGap,
  defaultAspectRatio = 0.8,
}: UseMasonryLayoutArgs): UseMasonryLayoutResult {
  // Measured heights cache. Keyed by id. Invalidated when columnWidth changes.
  const measuredHeights = useRef<Map<string, number>>(new Map());
  const lastColumnWidth = useRef<number>(0);
  // Bump to trigger re-layout when measured heights change.
  const [measureTick, setMeasureTick] = useState(0);

  const columnWidth = useMemo(() => {
    if (containerWidth <= 0 || columnCount <= 0) return 0;
    return (containerWidth - horizontalGap * (columnCount - 1)) / columnCount;
  }, [containerWidth, columnCount, horizontalGap]);

  // Invalidate measurement cache if column width changed (different layout).
  if (columnWidth !== lastColumnWidth.current && columnWidth > 0) {
    measuredHeights.current = new Map();
    lastColumnWidth.current = columnWidth;
  }

  const { positions, containerHeight } = useMemo(() => {
    const map = new Map<string, MasonryPosition>();
    if (columnWidth <= 0 || columnCount <= 0) {
      return { positions: map, containerHeight: 0 };
    }
    const colHeights = new Array(columnCount).fill(0);

    for (const item of items) {
      // Pick shortest column.
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

    const containerHeight = Math.max(0, ...colHeights) - verticalGap;
    return { positions: map, containerHeight };
    // measureTick triggers re-run after measurements come in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, columnWidth, columnCount, horizontalGap, verticalGap, defaultAspectRatio, measureTick]);

  // Schedule a single re-layout per frame when measurements arrive.
  const measureScheduled = useRef(false);
  const scheduleRelayout = useCallback(() => {
    if (measureScheduled.current) return;
    measureScheduled.current = true;
    requestAnimationFrame(() => {
      measureScheduled.current = false;
      setMeasureTick((t) => t + 1);
    });
  }, []);

  const measureRef = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (!node) return;
      const real = node.getBoundingClientRect().height;
      if (real <= 0) return;
      const prev = measuredHeights.current.get(id);
      if (prev !== undefined && Math.abs(prev - real) < 2) return;
      measuredHeights.current.set(id, real);
      scheduleRelayout();
    },
    [scheduleRelayout]
  );

  return { positions, containerHeight, measureRef };
}

/**
 * Track an element's clientWidth via ResizeObserver. Returns the latest width.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Initial
    setWidth(node.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}
