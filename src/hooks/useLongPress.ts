import { useCallback, useRef } from "react";

interface LongPressOptions {
  threshold?: number;
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onPress?: () => void;
}

interface LongPressResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

/**
 * Hook for detecting long press gestures on both touch and mouse devices.
 * Returns event handlers to attach to the target element.
 */
export const useLongPress = ({
  threshold = 500,
  onLongPress,
  onPress,
}: LongPressOptions): LongPressResult => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const wasCancelledRef = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent, clientX: number, clientY: number) => {
      isLongPressRef.current = false;
      wasCancelledRef.current = false;
      startPosRef.current = { x: clientX, y: clientY };

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress(e);
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const clear = useCallback(
    (shouldTriggerPress = true, wasCancelled = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (wasCancelled) {
        wasCancelledRef.current = true;
      }

      // Only trigger press if:
      // 1. shouldTriggerPress is true
      // 2. It wasn't a long press
      // 3. The gesture wasn't cancelled (e.g., by scrolling)
      if (shouldTriggerPress && !isLongPressRef.current && !wasCancelledRef.current && onPress) {
        onPress();
      }
    },
    [onPress]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start(e, touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isLongPressRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      clear(!isLongPressRef.current);
    },
    [clear]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current) return;

      const touch = e.touches[0];
      const moveThreshold = 10;
      const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPosRef.current.y);

      // Cancel long press if user moves finger too much (scrolling)
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clear(false, true); // Mark as cancelled
      }
    },
    [clear]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      start(e, e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isLongPressRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      clear(!isLongPressRef.current);
    },
    [clear]
  );

  const onMouseLeave = useCallback(() => {
    clear(false, true); // Mark as cancelled when mouse leaves
  }, [clear]);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
  };
};
