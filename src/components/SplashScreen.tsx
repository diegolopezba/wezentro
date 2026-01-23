import { useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
}

export const SplashScreen = memo(({
  onComplete,
  minDisplayTime = 800 // Reduced from 1200ms for faster perceived load
}: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, minDisplayTime);
    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  const handleAnimationComplete = () => {
    if (!isVisible) {
      onComplete();
    }
  };

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }} // Faster exit animation
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          style={{ background: "hsl(240 6% 4%)" }}
        >
          <motion.img
            alt="Loading..."
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }} // Faster entrance
            className="w-48 h-48 object-fill"
            src="/lovable-uploads/11ff2e19-f4c9-4c50-8921-c329037d49ac.png"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});