import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

/**
 * Pull-to-refresh component for mobile feeds and lists.
 * Wrap your scrollable content with this component.
 */
export const PullToRefresh = ({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className = "",
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const pullDistance = useMotionValue(0);
  const pullProgress = useTransform(pullDistance, [0, threshold], [0, 1]);
  const rotation = useTransform(pullDistance, [0, threshold], [0, 180]);
  const opacity = useTransform(pullDistance, [0, threshold / 2, threshold], [0, 0.5, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only enable pull-to-refresh when scrolled to top
    if (container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsPulling(false);
      pullDistance.set(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Apply resistance to pull
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, threshold * 1.5);
      pullDistance.set(distance);
      
      // Prevent default scrolling while pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing, threshold, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    const distance = pullDistance.get();
    
    if (distance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      pullDistance.set(threshold);
      haptic("medium");
      
      try {
        await onRefresh();
        haptic("success");
      } finally {
        setIsRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [isPulling, disabled, isRefreshing, threshold, pullDistance, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
            style={{ 
              top: 0,
              height: pullDistance,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              style={{ opacity }}
            >
              <motion.div
                style={{ rotate: isRefreshing ? undefined : rotation }}
                animate={isRefreshing ? { rotate: 360 } : undefined}
                transition={isRefreshing ? { 
                  duration: 1, 
                  repeat: Infinity, 
                  ease: "linear" 
                } : undefined}
              >
                <RefreshCw className="w-5 h-5 text-foreground" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with pull offset */}
      <motion.div
        style={{ 
          y: isPulling || isRefreshing ? pullDistance : 0,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
