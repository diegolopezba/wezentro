import { useEffect, type ReactNode } from "react";
import { m } from "framer-motion";
import { useNavigate } from "react-router-dom";

/**
 * Full-screen iOS-style push overlay. Renders on top of the persistent
 * shell (backgroundLocation pattern) so the underlying feed/tab stays
 * mounted and scroll-preserved. Slides in from the right using the
 * iOS push curve; closes via navigate(-1) so browser + Android back
 * work for free.
 */
export const PageModal = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  // Lock body scroll while the overlay is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <m.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto overscroll-contain"
      onClick={(e) => {
        // Allow inner links; nothing to do here — pages own their own back button.
        void navigate;
        void e;
      }}
    >
      {children}
    </m.div>
  );
};
