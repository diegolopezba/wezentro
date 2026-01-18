import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

const ONESIGNAL_APP_ID = "5b6aae46-50f4-4a83-b3cf-bf62ec1138f1";

// Platform detection helpers
const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

const getIOSVersion = (): number => {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
};

export interface PlatformSupport {
  supported: boolean;
  reason?: string;
  canRetry?: boolean;
}

interface OneSignalContextType {
  isReady: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  playerId: string | null;
  platformSupport: PlatformSupport;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

const OneSignalContext = createContext<OneSignalContextType | null>(null);

export const useOneSignal = () => {
  const context = useContext(OneSignalContext);
  if (!context) {
    throw new Error("useOneSignal must be used within a OneSignalProvider");
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const OneSignalProvider = ({ children }: Props) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [platformSupport, setPlatformSupport] = useState<PlatformSupport>({ supported: true });

  // Check platform support
  const checkPlatformSupport = useCallback((): PlatformSupport => {
    console.log("[OneSignal] Checking platform support...");
    console.log("[OneSignal] iOS:", isIOS(), "PWA:", isPWA());
    
    if (!('Notification' in window)) {
      return {
        supported: false,
        reason: "Your browser doesn't support push notifications",
        canRetry: false,
      };
    }

    if (isIOS()) {
      const iosVersion = getIOSVersion();
      console.log("[OneSignal] iOS version:", iosVersion);
      
      if (iosVersion < 16) {
        return {
          supported: false,
          reason: "Las notificaciones push requieren iOS 16.4 o posterior",
          canRetry: false,
        };
      }

      if (!isPWA()) {
        return {
          supported: false,
          reason: "Primero agrega esta app a tu pantalla de inicio, luego activa las notificaciones",
          canRetry: true,
        };
      }
    }

    if (Notification.permission === 'denied') {
      return {
        supported: false,
        reason: "Notifications are blocked. Please enable them in your device settings",
        canRetry: false,
      };
    }

    return { supported: true };
  }, []);

  // Initialize OneSignal SDK
  useEffect(() => {
    const initOneSignal = async () => {
      if (typeof window === "undefined") return;
      
      console.log("[OneSignal] Starting initialization...");
      
      // Check platform first
      const support = checkPlatformSupport();
      setPlatformSupport(support);
      
      if (!support.supported && !support.canRetry) {
        console.log("[OneSignal] Platform not supported:", support.reason);
        setIsLoading(false);
        return;
      }

      // Wait for service worker to be ready
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.ready;
          console.log("[OneSignal] Service worker ready");
        } catch (e) {
          console.log("[OneSignal] Service worker not ready yet");
        }
      }

      if (!window.OneSignal) {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);
        
        console.log("[OneSignal] SDK script added");

        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            console.log("[OneSignal] Calling init()...");
            
            await OneSignal.init({
              appId: ONESIGNAL_APP_ID,
              allowLocalhostAsSecureOrigin: true,
            });
            
            console.log("[OneSignal] Initialized successfully");
            setIsReady(true);
            await checkSubscriptionStatus(OneSignal);
          } catch (error) {
            console.error("[OneSignal] Init error:", error);
            setIsLoading(false);
          }
        });
      } else {
        console.log("[OneSignal] Already loaded");
        setIsReady(true);
        await checkSubscriptionStatus(window.OneSignal);
      }
    };

    const checkSubscriptionStatus = async (OneSignal: any) => {
      try {
        console.log("[OneSignal] Checking subscription status...");
        
        const permission = await OneSignal.Notifications.permission;
        const id = await OneSignal.User.PushSubscription.id;
        const optedIn = await OneSignal.User.PushSubscription.optedIn;
        
        console.log("[OneSignal] Status - Permission:", permission, "ID:", id, "OptedIn:", optedIn);
        
        setIsSubscribed(permission && !!id && optedIn);
        setPlayerId(id || null);
        setIsLoading(false);
      } catch (error) {
        console.error("[OneSignal] Status check error:", error);
        setIsLoading(false);
      }
    };

    initOneSignal();
    
    // Safety timeout
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("[OneSignal] Init timeout reached");
        setIsLoading(false);
      }
    }, 15000);
    
    return () => clearTimeout(timeout);
  }, [checkPlatformSupport]);

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
            console.error("[OneSignal] DB sync error:", error);
          }
        }
      } catch (error) {
        console.error("[OneSignal] Sync error:", error);
      }
    };

    syncPlayerId();
  }, [user?.id, playerId]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!platformSupport.supported) {
      console.log("[OneSignal] Cannot subscribe - platform not supported");
      return false;
    }

    if (!window.OneSignal || !isReady) {
      console.log("[OneSignal] Cannot subscribe - SDK not ready");
      return false;
    }

    try {
      setIsLoading(true);
      console.log("[OneSignal] Starting subscription...");
      
      await window.OneSignal.User.PushSubscription.optIn();
      console.log("[OneSignal] optIn completed");
      
      // Poll for subscription ID
      for (let i = 0; i < 30; i++) {
        const id = await window.OneSignal.User.PushSubscription.id;
        const permission = await window.OneSignal.Notifications.permission;
        const optedIn = await window.OneSignal.User.PushSubscription.optedIn;
        
        console.log(`[OneSignal] Poll ${i + 1}: permission=${permission}, id=${id}, optedIn=${optedIn}`);
        
        if (permission && id && optedIn) {
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
          
          setIsLoading(false);
          return true;
        }
        
        if (Notification.permission === 'denied') {
          console.log("[OneSignal] Permission denied by user");
          setPlatformSupport({
            supported: false,
            reason: "Notifications are blocked. Enable them in your device settings.",
            canRetry: false,
          });
          setIsLoading(false);
          return false;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log("[OneSignal] Subscription timed out");
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("[OneSignal] Subscribe error:", error);
      setIsLoading(false);
      return false;
    }
  }, [user?.id, platformSupport.supported, isReady]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!window.OneSignal) return false;

    try {
      setIsLoading(true);
      console.log("[OneSignal] Unsubscribing...");
      
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
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("[OneSignal] Unsubscribe error:", error);
      setIsLoading(false);
      return false;
    }
  }, [user?.id, playerId]);

  return (
    <OneSignalContext.Provider
      value={{
        isReady,
        isSubscribed,
        isLoading,
        playerId,
        platformSupport,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </OneSignalContext.Provider>
  );
};
