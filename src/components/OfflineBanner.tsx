import { AnimatePresence, m } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Thin connectivity banner for the installed app. In a standalone shell there
 * is no browser chrome to signal a dropped connection, so the app has to say it
 * instead of silently failing requests.
 */
export const OfflineBanner = () => {
  const { isOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {isOffline && (
        <m.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-x-0 top-0 z-[90] safe-top bg-foreground text-background"
          role="status"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium">
            <WifiOff className="h-3.5 w-3.5" />
            Sin conexión — algunas cosas no se van a actualizar
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
