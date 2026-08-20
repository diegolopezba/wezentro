import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeatureIntroStep {
  title: string;
  subtitle?: string;
  items: { icon: LucideIcon; label: string; desc: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: FeatureIntroStep[];
  /** Label of the final button. */
  finishLabel?: string;
}

/**
 * Reusable "how this section works" explainer, shown the first time a business
 * enters a feature page and re-openable from the header.
 */
export const FeatureIntroSheet = ({ open, onOpenChange, steps, finishLabel = "Entendido" }: Props) => {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const current = steps[step];

  const handleOpenChange = (v: boolean) => {
    if (!v) setStep(0);
    onOpenChange(v);
  };

  if (!current) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-0">
        <SheetTitle className="sr-only">{current.title}</SheetTitle>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 px-1 pt-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === step ? "w-6 bg-foreground" : "w-2 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="pt-5"
            >
              <h2 className="font-brand text-[26px] font-medium leading-tight text-foreground">
                {current.title}
              </h2>
              {current.subtitle && (
                <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>
              )}

              <div className="mt-4 space-y-2">
                {current.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </m.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center gap-2 pb-2">
            {step > 0 && (
              <Button
                variant="ghost"
                className="h-12 rounded-full px-5"
                onClick={() => setStep((s) => s - 1)}
              >
                Atrás
              </Button>
            )}
            <Button
              variant="sheet-action"
              className="h-12 flex-1 rounded-full text-base"
              onClick={() => (isLast ? handleOpenChange(false) : setStep((s) => s + 1))}
            >
              {isLast ? finishLabel : "Siguiente"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/** Opens the intro automatically the first time, and lets the header re-open it. */
export function useFeatureIntro(key: string) {
  const storageKey = `feature-intro:${key}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== "1") {
        localStorage.setItem(storageKey, "1");
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const reopen = useCallback(() => setOpen(true), []);
  return { open, setOpen, reopen };
}
