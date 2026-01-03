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
const SUBSCRIPTION_TIMEOUT_MS = 30000;

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
  const [lastError, setLastError] = useState<string | null>(null);

  // Check platform support on mount
  useEffect(() => {
    const checkPlatformSupport = () => {
      console.log("[Push] Checking platform support...");
      console.log("[Push] Platform - iOS:", isIOS(), "Android:", isAndroid(), "PWA:", isPWA());
      
      // Check if Notification API is available
      if (!('Notification' in window)) {
        console.log("[Push] Notification API not available");
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
        console.log("[Push] iOS version:", iosVersion);
        
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
        console.log("[Push] Notifications are denied");
        setPlatformSupport({
          supported: false,
          reason: "Notifications are blocked. Please enable them in your device settings",
          canRetry: false,
        });
        return;
      }

      console.log("[Push] Platform support: OK");
      setPlatformSupport({ supported: true });
    };

    checkPlatformSupport();
  }, []);

  // Initialize OneSignal - no explicit service worker registration
  useEffect(() => {
    const initOneSignal = async () => {
      if (typeof window === "undefined") return;
      
      console.log("[Push] Initializing OneSignal...");
      
      // Wait for service worker to be ready first
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          console.log("[Push] Service worker ready:", registration.scope);
        } catch (e) {
          console.log("[Push] Service worker not ready yet");
        }
      }
      
      if (!window.OneSignal) {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);
        
        console.log("[Push] OneSignal SDK script added");

        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            console.log("[Push] Calling OneSignal.init()...");
            
            // Don't specify serviceWorkerParam - let it use the merged SW
            await OneSignal.init({
              appId: ONESIGNAL_APP_ID,
              allowLocalhostAsSecureOrigin: true,
              // Let OneSignal find the service worker at the default location
            });
            
            console.log("[Push] OneSignal initialized successfully");
            checkSubscriptionStatus(OneSignal);
          } catch (error) {
            console.error("[Push] OneSignal init error:", error);
            setLastError(error instanceof Error ? error.message : "Initialization failed");
            setIsLoading(false);
          }
        });
      } else {
        console.log("[Push] OneSignal already loaded");
        checkSubscriptionStatus(window.OneSignal);
      }
    };

    const checkSubscriptionStatus = async (OneSignal: any) => {
      try {
        console.log("[Push] Checking subscription status...");
        
        // Get both permission and subscription state
        const permission = await OneSignal.Notifications.permission;
        const id = await OneSignal.User.PushSubscription.id;
        const optedIn = await OneSignal.User.PushSubscription.optedIn;
        
        console.log("[Push] Status - Permission:", permission, "ID:", id, "OptedIn:", optedIn);
        
        setIsSubscribed(permission && !!id && optedIn);
        setPlayerId(id || null);
        setIsLoading(false);
      } catch (error) {
        console.error("[Push] Status check error:", error);
        setIsLoading(false);
      }
    };

    initOneSignal();
    
    // Safety timeout
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("[Push] Init timeout reached");
        setIsLoading(false);
      }
    }, 15000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Sync player ID with database
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
            console.error("[Push] DB sync error:", error);
          }
        }
      } catch (error) {
        console.error("[Push] Sync error:", error);
      }
    };

    syncPlayerId();
  }, [user?.id, playerId]);

  const subscribe = useCallback(async () => {
    setLastError(null);
    
    if (!platformSupport.supported) {
      toast.error(platformSupport.reason || "Push notifications not supported");
      return false;
    }

    if (!window.OneSignal) {
      toast.error("Push service is loading. Please wait and try again.");
      return false;
    }

    try {
      setIsLoading(true);
      console.log("[Push] Starting subscription...");
      
      // Check service worker status
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log("[Push] Active service workers:", registrations.length);
        registrations.forEach((reg, i) => {
          console.log(`[Push] SW ${i}:`, reg.scope, reg.active?.state);
        });
      }
      
      // Create a promise that resolves when we get a subscription ID
      const subscribeWithPolling = async (): Promise<{ success: boolean; id?: string }> => {
        // First, call optIn
        console.log("[Push] Calling optIn...");
        await window.OneSignal.User.PushSubscription.optIn();
        console.log("[Push] optIn completed");
        
        // Poll for the subscription ID
        for (let i = 0; i < 30; i++) {
          const id = await window.OneSignal.User.PushSubscription.id;
          const permission = await window.OneSignal.Notifications.permission;
          const optedIn = await window.OneSignal.User.PushSubscription.optedIn;
          
          console.log(`[Push] Poll ${i + 1}: permission=${permission}, id=${id}, optedIn=${optedIn}`);
          
          if (permission && id && optedIn) {
            return { success: true, id };
          }
          
          if (!permission && Notification.permission === 'denied') {
            console.log("[Push] Permission denied by user");
            return { success: false };
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return { success: false };
      };
      
      // Race against timeout
      const timeoutPromise = new Promise<{ success: boolean }>((resolve) => 
        setTimeout(() => {
          console.log("[Push] Subscription timeout");
          resolve({ success: false });
        }, SUBSCRIPTION_TIMEOUT_MS)
      );
      
      const result = await Promise.race([subscribeWithPolling(), timeoutPromise]);
      
      if (result.success && 'id' in result && result.id) {
        console.log("[Push] Success! ID:", result.id);
        setIsSubscribed(true);
        setPlayerId(result.id);
        
        if (user?.id) {
          await supabase.from("push_subscriptions").upsert({
            user_id: user.id,
            onesignal_player_id: result.id,
            device_type: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "mobile" : "web",
          }, {
            onConflict: "user_id,onesignal_player_id",
          });
        }
        
        toast.success("Push notifications enabled!");
        return true;
      } else {
        // Check final state
        const finalPermission = Notification.permission;
        console.log("[Push] Final permission state:", finalPermission);
        
        if (finalPermission === 'denied') {
          setPlatformSupport({
            supported: false,
            reason: "Notifications are blocked. Enable them in your device settings.",
            canRetry: false,
          });
          setLastError("Permission denied");
          toast.error("Permission denied");
        } else {
          setLastError("Subscription timed out");
          toast.error("Setup timed out. Please try again.");
        }
        return false;
      }
    } catch (error) {
      console.error("[Push] Subscribe error:", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      setLastError(msg);
      toast.error("Failed to enable notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, platformSupport]);

  const unsubscribe = useCallback(async () => {
    if (!window.OneSignal) return false;

    try {
      setIsLoading(true);
      console.log("[Push] Unsubscribing...");
      
      await window.OneSignal.User.PushSubscription.optOut();
      
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
      console.error("[Push] Unsubscribe error:", error);
      toast.error("Failed to disable notifications");
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
    lastError,
  };
};
