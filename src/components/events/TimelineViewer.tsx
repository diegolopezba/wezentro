import { useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
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
  const { openEvent, closeEvent, selectedEventId } = useSelectedEvent();

  // Open the initial item
  useEffect(() => {
    if (items[initialIndex]) {
      openEvent(items[initialIndex].id);
    }
    return () => {
      closeEvent();
    };
  }, [initialIndex]);

  // When the overlay is dismissed (back button, X), close the viewer too
  useEffect(() => {
    if (selectedEventId === null) {
      onClose();
    }
  }, [selectedEventId]);

  const hasPrev = initialIndex > 0;
  const hasNext = initialIndex < items.length - 1;

  const goTo = (newIndex: number) => {
    openEvent(items[newIndex].id);
    document.dispatchEvent(
      new CustomEvent("timeline-viewer-navigate", { detail: newIndex })
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed bottom-28 right-4 z-[200] flex flex-col gap-2"
      >
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full shadow-lg disabled:opacity-30"
          disabled={!hasPrev}
          onClick={() => goTo(initialIndex - 1)}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full shadow-lg disabled:opacity-30"
          disabled={!hasNext}
          onClick={() => goTo(initialIndex + 1)}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};
