import { motion, AnimatePresence } from "framer-motion";
import { useWalkthroughSafe } from "@/contexts/WalkthroughContext";

export const WalkthroughOverlay = () => {
  const walkthrough = useWalkthroughSafe();

  if (!walkthrough || !walkthrough.isActive) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 pointer-events-none"
        aria-hidden="true"
      />
    </AnimatePresence>
  );
};
