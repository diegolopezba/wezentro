import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

const ONESIGNAL_APP_ID = "5b6aae46-50f4-4a83-b3cf-bf62ec1138f1";
const PERMISSION_TIMEOUT_MS = 20000;
const SUBSCRIPTION_CHECK_INTERVAL = 500;
const MAX_SUBSCRIPTION_CHECKS = 20;

// Platform detection helpers
const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = () => /Android/.test(navigator.userAgent);

const getIOSVersion = (): number => {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
};

// Timeout wrapper for async operations
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );
  return Promise.race([promise, timeout]);
};

export interface PlatformSupport {
  supported: boolean;
  reason?: string;
  canRetry?: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [platformSupport, setPlatformSupport] = useState<PlatformSupport>({ supported: true });

  // Check platform support on mount
  useEffect(() => {
    const checkPlatformSupport = () => {
      // Check if Notification API is available
      if (!('Notification' in window)) {
        setPlatformSupport({
          supported: false,
          reason: "Your browser doesn't support push notifications",
          canRetry: false,
        });
        return;
      }

      // iOS-specific checks
      if (isIOS()) {
        const iosVersion = getIOSVersion();
        
        if (iosVersion < 16) {
          setPlatformSupport({
            supported: false,
            reason: "Push notifications require iOS 16.4 or later",
            canRetry: false,
          });
          return;
        }

        if (!isPWA()) {
          setPlatformSupport({
            supported: false,
            reason: "Add this app to your Home Screen first, then enable notifications",
            canRetry: true,
          });
          return;
        }
      }

      // Check if permission was previously denied
      if (Notification.permission === 'denied') {
        setPlatformSupport({
          supported: false,
          reason: "Notifications are blocked. Please enable them in your device settings",
          canRetry: false,
        });
        return;
      }

      setPlatformSupport({ supported: true });
    };

    checkPlatformSupport();
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    const initOneSignal = async () => {
      if (typeof window === "undefined") return;
      
      console.log("[Push] Initializing OneSignal...");
      console.log("[Push] Platform - iOS:", isIOS(), "Android:", isAndroid(), "PWA:", isPWA());
      
      if (!window.OneSignal) {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);
        
        console.log("[Push] OneSignal SDK script added to page");

        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            console.log("[Push] Calling OneSignal.init()...");
            await withTimeout(
              OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                allowLocalhostAsSecureOrigin: true,
                serviceWorkerParam: { scope: "/" },
              }),
              10000,
              "OneSignal initialization timed out"
            );
            console.log("[Push] OneSignal initialized successfully");
            checkSubscriptionStatus(OneSignal);
          } catch (error) {
            console.error("[Push] OneSignal initialization failed:", error);
            setIsLoading(false);
          }
        });
      } else {
        console.log("[Push] OneSignal already loaded, checking status...");
        checkSubscriptionStatus(window.OneSignal);
      }
    };

    const checkSubscriptionStatus = async (OneSignal: any) => {
      try {
        console.log("[Push] Checking subscription status...");
        const permission = await OneSignal.Notifications.permission;
        const id = await OneSignal.User.PushSubscription.id;
        
        console.log("[Push] Permission:", permission, "Player ID:", id);
        setIsSubscribed(permission && !!id);
        setPlayerId(id || null);
        setIsLoading(false);
      } catch (error) {
        console.error("[Push] Error checking subscription status:", error);
        setIsLoading(false);
      }
    };

    initOneSignal();
    
    const timeout = setTimeout(() => {
      setIsLoading(false);
      console.log("[Push] Initialization timeout - setting loading to false");
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Sync player ID with database when user is logged in
  useEffect(() => {
    const syncPlayerId = async () => {
      if (!user?.id || !playerId) return;

      try {
        const { data: existing } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("onesignal_player_id", playerId)
          .single();

        if (!existing) {
          const { error } = await supabase.from("push_subscriptions").insert({
            user_id: user.id,
            onesignal_player_id: playerId,
            device_type: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "mobile" : "web",
          });

          if (error && error.code !== "23505") {
            console.error("Error syncing push subscription:", error);
          }
        }
      } catch (error) {
        console.error("Error syncing player ID:", error);
      }
    };

    syncPlayerId();
  }, [user?.id, playerId]);

  const subscribe = useCallback(async () => {
    // Check platform support first
    if (!platformSupport.supported) {
      toast.error(platformSupport.reason || "Push notifications not supported");
      return false;
    }

    if (!window.OneSignal) {
      toast.error("Push notifications are still loading. Please try again.");
      return false;
    }

    try {
      setIsLoading(true);
      console.log("[Push] Starting subscription flow...");
      
      // Use OneSignal's optIn directly - it handles permission request internally
      // This is more reliable on mobile PWA than using native Notification API
      console.log("[Push] Calling OneSignal optIn...");
      
      const optInPromise = window.OneSignal.User.PushSubscription.optIn();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), PERMISSION_TIMEOUT_MS)
      );
      
      await Promise.race([optInPromise, timeoutPromise]);
      console.log("[Push] optIn completed");
      
      // Give a brief moment for subscription to register
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check the result
      const permission = await window.OneSignal.Notifications.permission;
      const id = await window.OneSignal.User.PushSubscription.id;
      
      console.log("[Push] Result - Permission:", permission, "Player ID:", id);
      
      if (permission && id) {
        setIsSubscribed(true);
        setPlayerId(id);
        
        if (user?.id) {
          await supabase.from("push_subscriptions").upsert({
            user_id: user.id,
            onesignal_player_id: id,
            device_type: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "mobile" : "web",
          }, {
            onConflict: "user_id,onesignal_player_id",
          });
        }
        
        toast.success("Push notifications enabled!");
        return true;
      } else if (!permission) {
        setPlatformSupport({
          supported: false,
          reason: "Notifications are blocked. Please enable them in your device settings",
          canRetry: false,
        });
        toast.error("Permission denied");
        return false;
      } else {
        // Permission granted but no ID - try polling
        console.log("[Push] Polling for subscription ID...");
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const pollId = await window.OneSignal.User.PushSubscription.id;
          if (pollId) {
            setIsSubscribed(true);
            setPlayerId(pollId);
            if (user?.id) {
              await supabase.from("push_subscriptions").upsert({
                user_id: user.id,
                onesignal_player_id: pollId,
                device_type: "mobile",
              }, { onConflict: "user_id,onesignal_player_id" });
            }
            toast.success("Push notifications enabled!");
            return true;
          }
        }
        toast.error("Setup incomplete. Please try again.");
        return false;
      }
    } catch (error) {
      console.error("[Push] Error:", error);
      const msg = error instanceof Error ? error.message : "";
      
      if (msg === "timeout") {
        // Check if permission was granted despite timeout
        try {
          const permission = await window.OneSignal.Notifications.permission;
          const id = await window.OneSignal.User.PushSubscription.id;
          if (permission && id) {
            setIsSubscribed(true);
            setPlayerId(id);
            toast.success("Push notifications enabled!");
            return true;
          }
        } catch {}
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error("Failed to enable notifications. Please try again.");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, platformSupport]);

  const unsubscribe = useCallback(async () => {
    if (!window.OneSignal) return false;

    try {
      setIsLoading(true);
      
      await withTimeout(
        window.OneSignal.User.PushSubscription.optOut(),
        10000,
        "Unsubscribe timed out"
      );
      
      if (user?.id && playerId) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("onesignal_player_id", playerId);
      }
      
      setIsSubscribed(false);
      setPlayerId(null);
      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      console.error("[Push] Error unsubscribing:", error);
      toast.error("Failed to disable push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, playerId]);

  const recheckPlatformSupport = useCallback(() => {
    if (isIOS() && isPWA()) {
      setPlatformSupport({ supported: true });
      return true;
    }
    return false;
  }, []);

  return {
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    playerId,
    platformSupport,
    recheckPlatformSupport,
  };
};
