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

    // Check current permission status
    if ('Notification' in window && Notification.permission === 'denied') {
      toast.error("Notifications are blocked. Please enable them in your device settings.");
      setPlatformSupport({
        supported: false,
        reason: "Notifications are blocked. Please enable them in your device settings",
        canRetry: false,
      });
      return false;
    }

    try {
      setIsLoading(true);
      console.log("[Push] Starting subscription flow...");
      console.log("[Push] Current Notification.permission:", Notification.permission);
      
      // Step 1: Request native notification permission first (more reliable on mobile PWA)
      if ('Notification' in window && Notification.permission === 'default') {
        console.log("[Push] Requesting native notification permission...");
        try {
          const nativePermission = await withTimeout(
            Notification.requestPermission(),
            PERMISSION_TIMEOUT_MS,
            "Permission request timed out"
          );
          console.log("[Push] Native permission result:", nativePermission);
          
          if (nativePermission === 'denied') {
            setPlatformSupport({
              supported: false,
              reason: "Notifications are blocked. Please enable them in your device settings",
              canRetry: false,
            });
            toast.error("Permission denied for push notifications");
            return false;
          }
        } catch (error) {
          console.error("[Push] Native permission request failed:", error);
          // Continue anyway - OneSignal might handle it
        }
      }
      
      // Step 2: Use OneSignal to set up the subscription
      console.log("[Push] Setting up OneSignal subscription...");
      
      // Try to opt in the user (this is more reliable than requestPermission on some platforms)
      try {
        await withTimeout(
          window.OneSignal.User.PushSubscription.optIn(),
          10000,
          "Subscription setup timed out"
        );
        console.log("[Push] optIn() completed");
      } catch (optInError) {
        console.log("[Push] optIn() failed, trying requestPermission...", optInError);
        // Fallback to requestPermission
        await withTimeout(
          window.OneSignal.Notifications.requestPermission(),
          10000,
          "Permission request timed out"
        );
      }
      
      // Step 3: Poll for subscription ID (sometimes takes a moment to be available)
      console.log("[Push] Polling for subscription ID...");
      let id: string | null = null;
      let permission = false;
      
      for (let i = 0; i < MAX_SUBSCRIPTION_CHECKS; i++) {
        permission = await window.OneSignal.Notifications.permission;
        id = await window.OneSignal.User.PushSubscription.id;
        
        console.log(`[Push] Check ${i + 1}: permission=${permission}, id=${id}`);
        
        if (permission && id) {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, SUBSCRIPTION_CHECK_INTERVAL));
      }
      
      console.log("[Push] Final: Permission:", permission, "Player ID:", id);
      
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
        // Permission was denied
        setPlatformSupport({
          supported: false,
          reason: "Notifications are blocked. Please enable them in your device settings",
          canRetry: false,
        });
        toast.error("Permission denied for push notifications");
        return false;
      } else {
        // Permission granted but no ID yet - might need more time
        toast.error("Subscription pending. Please try again in a moment.");
        return false;
      }
    } catch (error) {
      console.error("[Push] Error subscribing:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("timed out")) {
        // Check if permission was actually granted despite timeout
        if ('Notification' in window && Notification.permission === 'granted') {
          toast.error("Setup taking longer than expected. Please try again.");
        } else {
          toast.error("Request timed out. Please try again.");
        }
      } else if (isIOS() && !isPWA()) {
        toast.error("Add this app to your Home Screen first, then enable notifications");
      } else {
        toast.error("Failed to enable push notifications. Please try again.");
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
