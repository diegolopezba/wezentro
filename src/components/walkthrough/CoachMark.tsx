import { ReactNode, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWalkthroughSafe } from "@/contexts/WalkthroughContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CoachMarkProps {
  stepId: string;
  children: ReactNode;
  className?: string;
}

export const CoachMark = ({ stepId, children, className }: CoachMarkProps) => {
  const walkthrough = useWalkthroughSafe();
  const targetRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  const isActive = walkthrough?.isStepActive(stepId) ?? false;
  const currentStepData = walkthrough?.currentStepData;
  const currentStep = walkthrough?.currentStep ?? 0;
  const totalSteps = walkthrough?.totalSteps ?? 0;

  // Calculate tooltip position when active
  useEffect(() => {
    if (!isActive || !targetRef.current || !currentStepData) {
      setTooltipPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = targetRef.current?.getBoundingClientRect();
      if (!rect) return;

      const position = currentStepData.position;
      const tooltipWidth = 288; // w-72 = 18rem = 288px
      const tooltipHeight = 160; // approximate height
      const gap = 12;

      let top = 0;
      let left = 0;

      switch (position) {
        case "bottom":
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "top":
          top = rect.top - tooltipHeight - gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - gap;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
          break;
      }

      // Clamp to viewport
      const padding = 16;
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

      setTooltipPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isActive, currentStepData]);

  if (!walkthrough) {
    return <>{children}</>;
  }

  const { nextStep, skipWalkthrough } = walkthrough;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <>
      <div ref={targetRef} className={cn("relative", className)}>
        {/* Target element with highlight ring when active */}
        {isActive && (
          <motion.div
            className="absolute -inset-2 rounded-2xl pointer-events-none z-[60]"
            style={{
              boxShadow: "0 0 0 3px hsl(351 100% 50% / 0.5)",
            }}
            animate={{
              boxShadow: [
                "0 0 0 3px hsl(351 100% 50% / 0.5)",
                "0 0 0 6px hsl(351 100% 50% / 0.2)",
                "0 0 0 3px hsl(351 100% 50% / 0.5)",
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
        <div className={isActive ? "relative z-[60]" : undefined}>
          {children}
        </div>
      </div>

      {/* Tooltip rendered in portal to escape overflow:hidden containers */}
      {isActive && currentStepData && tooltipPosition && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[70] w-72 p-4 rounded-2xl bg-card border border-border shadow-elevated"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            {/* Content */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {currentStepData.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentStepData.message}
                </p>
              </div>

              {/* Step indicator dots */}
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      i === currentStep ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={skipWalkthrough}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Omitir tour
                </button>
                <Button size="sm" onClick={nextStep}>
                  {isLastStep ? "¡Entendido!" : "Siguiente"}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
