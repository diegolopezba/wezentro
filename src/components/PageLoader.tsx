import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export const PageLoader = () => {
  const [showLoader, setShowLoader] = useState(false);

  // Delay showing loader to prevent flash on fast loads (native app feel)
  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Show solid background immediately to prevent black screen, but delay spinner
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      {showLoader && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
    </div>
  );
};
