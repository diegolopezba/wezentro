import { motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineFallbackProps {
  onRetry?: () => void;
  message?: string;
}

/**
 * Offline fallback component displayed when network is unavailable.
 * Provides retry functionality for reconnection attempts.
 */
export const OfflineFallback = ({ 
  onRetry, 
  message = "Sin conexión a internet" 
}: OfflineFallbackProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-brand text-lg font-semibold text-foreground mb-2">
        {message}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        Revisa tu conexión e intenta de nuevo
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </Button>
      )}
    </motion.div>
  );
};
