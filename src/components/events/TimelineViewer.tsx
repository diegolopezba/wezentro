import { useEffect } from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useSelectedEvent } from "@/contexts/SelectedEventContext";
import { TimelineItem } from "@/hooks/useUserTimeline";

interface TimelineViewerProps {
  items: TimelineItem[];
  initialIndex: number;
  onClose: () => void;
}

export const TimelineViewer = ({ items, initialIndex, onClose }: TimelineViewerProps) => {
  const { openEvent, closeEvent } = useSelectedEvent();

  // Keep the overlay open to the current item
  useEffect(() => {
    if (items[initialIndex]) {
      openEvent(items[initialIndex].id);
    }
    return () => {
      closeEvent();
    };
  }, [initialIndex]);

  const hasPrev = initialIndex > 0;
  const hasNext = initialIndex < items.length - 1;

  return (
    <>
      {/* Navigation controls – float over the EventDetailOverlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-28 right-4 z-[200] flex flex-col gap-2"
        >
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg opacity-90 disabled:opacity-30"
            disabled={!hasPrev}
            onClick={() => {
              if (hasPrev) {
                openEvent(items[initialIndex - 1].id);
                // bubble up so parent updates index
                document.dispatchEvent(
                  new CustomEvent("timeline-viewer-navigate", { detail: initialIndex - 1 })
                );
              }
            }}
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg opacity-90 disabled:opacity-30"
            disabled={!hasNext}
            onClick={() => {
              if (hasNext) {
                openEvent(items[initialIndex + 1].id);
                document.dispatchEvent(
                  new CustomEvent("timeline-viewer-navigate", { detail: initialIndex + 1 })
                );
              }
            }}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
