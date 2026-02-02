import { ReactNode } from "react";
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

  if (!walkthrough) {
    return <>{children}</>;
  }

  const { isStepActive, currentStepData, nextStep, skipWalkthrough, currentStep, totalSteps } =
    walkthrough;

  const isActive = isStepActive(stepId);

  if (!isActive || !currentStepData) {
    return <>{children}</>;
  }

  const position = currentStepData.position;
  const isLastStep = currentStep === totalSteps - 1;

  // Position classes for the tooltip
  const tooltipPositionClasses = {
    top: "bottom-full mb-3 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-3 left-1/2 -translate-x-1/2",
    left: "right-full mr-3 top-1/2 -translate-y-1/2",
    right: "left-full ml-3 top-1/2 -translate-y-1/2",
  };

  // Arrow classes
  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-card border-x-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-card border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-card border-y-transparent border-r-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-card border-y-transparent border-l-transparent",
  };

  return (
    <div className={cn("relative", className)}>
      {/* Target element with highlight ring */}
      <div className="relative z-[60]">
        {/* Pulsing highlight ring */}
        <motion.div
          className="absolute -inset-2 rounded-2xl pointer-events-none"
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
        {children}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute z-[70] w-72 p-4 rounded-2xl bg-card border border-border shadow-elevated",
            tooltipPositionClasses[position]
          )}
        >
          {/* Arrow */}
          <div
            className={cn("absolute w-0 h-0 border-8", arrowClasses[position])}
          />

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
      </AnimatePresence>
    </div>
  );
};
