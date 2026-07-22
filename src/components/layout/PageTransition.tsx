import { m } from "framer-motion";
import { type ReactNode } from "react";

/**
 * Page-entry transition wrapper. Fade + subtle upward slide using Apple's
 * iOS push curve so secondary pages appear smoothly instead of popping in.
 *
 * Intentionally enter-only: pairing with AnimatePresence for exit
 * choreography is deferred to Phase 2 (modal-over-shell) so we don't
 * remount the persistent tab shell on every navigation.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => (
  <m.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
    style={{ minHeight: "100dvh" }}
  >
    {children}
  </m.div>
);
