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

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Initialize OneSignal
  useEffect(() => {
    const initOneSignal = async () => {
      // Skip if already initialized or no window
      if (typeof window === "undefined") return;
      
      console.log("[Push] Initializing OneSignal...");
      
      // Load OneSignal SDK if not already loaded
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
            await OneSignal.init({
              appId: ONESIGNAL_APP_ID,
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerParam: { scope: "/" },
            });
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
    
    // Timeout fallback in case initialization hangs
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
        // Check if already synced
        const { data: existing } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("onesignal_player_id", playerId)
          .single();

        if (!existing) {
          // Insert new subscription
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
    if (!window.OneSignal) {
      toast.error("Push notifications not available");
      return false;
    }

    try {
      setIsLoading(true);
      
      // Request permission
      await window.OneSignal.Notifications.requestPermission();
      
      const permission = await window.OneSignal.Notifications.permission;
      const id = await window.OneSignal.User.PushSubscription.id;
      
      if (permission && id) {
        setIsSubscribed(true);
        setPlayerId(id);
        
        // Sync with database
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
      } else {
        toast.error("Permission denied for push notifications");
        return false;
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error("Failed to enable push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const unsubscribe = useCallback(async () => {
    if (!window.OneSignal) return false;

    try {
      setIsLoading(true);
      
      await window.OneSignal.User.PushSubscription.optOut();
      
      // Remove from database
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
      console.error("Error unsubscribing from push notifications:", error);
      toast.error("Failed to disable push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, playerId]);

  return {
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    playerId,
  };
};
