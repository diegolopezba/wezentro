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
  const lastColumnWidth = useRef<number>(0);
  const [measureTick, setMeasureTick] = useState(0);

  const columnWidth = useMemo(() => {
    if (containerWidth <= 0 || columnCount <= 0) return 0;
    return (containerWidth - horizontalGap * (columnCount - 1)) / columnCount;
  }, [containerWidth, columnCount, horizontalGap]);

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

  const measureElement = useCallback(
    (id: string, node: HTMLElement | null) => {
      if (!node) return;
      const real = node.getBoundingClientRect().height;
      if (real <= 0) return;
      const prev = measuredHeights.current.get(id);
      if (prev !== undefined && Math.abs(prev - real) < 1) return;
      measuredHeights.current.set(id, real);
      scheduleRelayout();
    },
    [scheduleRelayout]
  );

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
