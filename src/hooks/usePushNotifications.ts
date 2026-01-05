import { useOneSignal } from "@/contexts/OneSignalContext";
import { toast } from "sonner";
import { useCallback } from "react";

// Re-export PlatformSupport type for backward compatibility
export type { PlatformSupport } from "@/contexts/OneSignalContext";

export const usePushNotifications = () => {
  const {
    isReady,
    isSubscribed,
    isLoading,
    playerId,
    platformSupport,
    subscribe: contextSubscribe,
    unsubscribe: contextUnsubscribe,
  } = useOneSignal();

  const subscribe = useCallback(async () => {
    if (!platformSupport.supported) {
      toast.error(platformSupport.reason || "Push notifications not supported");
      return false;
    }

    if (!isReady) {
      toast.error("Push service is loading. Please wait and try again.");
      return false;
    }

    const success = await contextSubscribe();
    if (success) {
      toast.success("Push notifications enabled!");
    } else if (Notification.permission !== 'denied') {
      toast.error("Setup timed out. Please try again.");
    }
    return success;
  }, [contextSubscribe, isReady, platformSupport]);

  const unsubscribe = useCallback(async () => {
    const success = await contextUnsubscribe();
    if (success) {
      toast.success("Push notifications disabled");
    } else {
      toast.error("Failed to disable notifications");
    }
    return success;
  }, [contextUnsubscribe]);

  const recheckPlatformSupport = useCallback(() => {
    // This is now handled by the context
    return platformSupport.supported;
  }, [platformSupport.supported]);

  return {
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    playerId,
    platformSupport,
    recheckPlatformSupport,
    isReady,
  };
};
