import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Route-level Suspense fallback.
 *
 * Pinterest-native pattern: never flash a spinner unless the load is
 * genuinely slow. Renders an invisible full-height background instantly
 * so there's no black flash between routes, and only reveals the spinner
 * after 250ms — most chunk loads on wifi/4g resolve before then.
 */
export const PageLoader = () => {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSpinner(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-[100dvh] bg-background flex items-center justify-center"
      style={{ opacity: showSpinner ? 1 : 0, transition: "opacity 150ms ease-out" }}
      aria-hidden={!showSpinner}
    >
      {showSpinner && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
    </div>
  );
};
