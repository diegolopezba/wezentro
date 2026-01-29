import { useEffect, useState } from "react";

type NetworkStatus = "online" | "offline";

/**
 * Hook to track network connectivity status.
 * Returns current status and provides callbacks for status changes.
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(
    navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    const handleOnline = () => setStatus("online");
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    status,
    isOnline: status === "online",
    isOffline: status === "offline",
  };
};
