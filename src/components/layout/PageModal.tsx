import { useEffect, type ReactNode } from "react";
import { m, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { useIsDesktop } from "@/hooks/useIsDesktop";

/**
 * Mobile: full-screen iOS-style push overlay with interactive drag-to-dismiss.
 * Desktop: Pinterest-style centered overlay card over a dimmed background,
 * closed by clicking outside (or the page's own close control).
 *
 * The underlying shell (feed/tab) stays mounted so scroll is preserved.
 */
const DISMISS_DISTANCE_RATIO = 0.35;
const DISMISS_VELOCITY = 500;

export const PageModal = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const x = useMotionValue(0);
  // Dim the shell behind while dragging — fades as the sheet moves away.
  const backdropOpacity = useTransform(x, [0, window.innerWidth], [0.35, 0]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const width = window.innerWidth || 1;
    const past = info.offset.x > width * DISMISS_DISTANCE_RATIO;
    const flick = info.velocity.x > DISMISS_VELOCITY;
    if (past || flick) {
      haptic("light");
      navigate(-1);
    }
  };

  if (isDesktop) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => navigate(-1)}
          aria-hidden
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
          <m.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="pointer-events-auto w-full max-w-5xl max-h-[92vh] overflow-y-auto overscroll-contain rounded-3xl bg-background shadow-2xl"
          >
            {children}
          </m.div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Dim layer over the persistent shell. */}
      <m.div
        aria-hidden
        className="fixed inset-0 z-40 bg-black pointer-events-none"
        style={{ opacity: backdropOpacity }}
      />
      <m.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 1 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="fixed inset-0 z-50 bg-background overflow-y-auto overscroll-contain shadow-2xl"
      >
        {children}
      </m.div>
    </>
  );
};
