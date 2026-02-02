import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useWalkthroughSafe } from "@/contexts/WalkthroughContext";

export const WalkthroughOverlay = () => {
  const walkthrough = useWalkthroughSafe();
  const location = useLocation();

  if (!walkthrough || !walkthrough.isActive || !walkthrough.currentStepData) {
    return null;
  }

  // Only show overlay if current step is on the current page
  const stepPage = walkthrough.currentStepData.page;
  const currentPath = location.pathname;
  const isOnCurrentPage = 
    currentPath === stepPage || 
    currentPath.startsWith(stepPage + "/") ||
    (stepPage === "/event" && currentPath.startsWith("/event/"));

  if (!isOnCurrentPage) {
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
