import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { logger } from "@/lib/logger";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

const ONESIGNAL_APP_ID = "5b6aae46-50f4-4a83-b3cf-bf62ec1138f1";

// Platform detection helpers
const isNative = () => Capacitor.isNativePlatform();

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

// Store native OneSignal instance
let nativeOneSignal: any = null;

export const OneSignalProvider = ({ children }: Props) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [platformSupport, setPlatformSupport] = useState<PlatformSupport>({ supported: true });

  // Check platform support for web
  const checkWebPlatformSupport = useCallback((): PlatformSupport => {
    logger.log("[OneSignal] Checking web platform support...");
    
    if (!('Notification' in window)) {
      return {
        supported: false,
        reason: "Your browser doesn't support push notifications",
        canRetry: false,
      };
    }

    if (isIOS()) {
      const iosVersion = getIOSVersion();
      logger.log("[OneSignal] iOS version:", iosVersion);
      
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

  // Initialize Native OneSignal (Capacitor)
  const initNativeOneSignal = useCallback(async () => {
    logger.log("[OneSignal] Initializing native SDK...");
    
    try {
      const OneSignalModule = await import('onesignal-cordova-plugin');
      nativeOneSignal = OneSignalModule.default;
      
      nativeOneSignal.initialize(ONESIGNAL_APP_ID);
      
      logger.log("[OneSignal] Native SDK initialized");
      
      const hasPermission = await nativeOneSignal.Notifications.getPermissionAsync();
      const subscriptionId = await nativeOneSignal.User.pushSubscription.getIdAsync();
      const optedIn = await nativeOneSignal.User.pushSubscription.getOptedInAsync();
      
      logger.log("[OneSignal] Native status - Permission:", hasPermission, "ID:", subscriptionId, "OptedIn:", optedIn);
      
      setIsReady(true);
      setIsSubscribed(hasPermission && !!subscriptionId && optedIn);
      setPlayerId(subscriptionId || null);
      setPlatformSupport({ supported: true });
      setIsLoading(false);
      
      nativeOneSignal.User.pushSubscription.addEventListener('change', (event: any) => {
        logger.log("[OneSignal] Subscription changed:", event);
        setIsSubscribed(event.current.optedIn);
        setPlayerId(event.current.id || null);
      });

      // Tapping a notification must route into the app. This can fire before
      // the router mounts (cold start), so the path is queued.
      nativeOneSignal.Notifications.addEventListener('click', (event: any) => {
        const data = event?.notification?.additionalData || {};
        const target = data.route || data.url || event?.notification?.launchURL;
        logger.log("[OneSignal] Notification clicked, target:", target);
        queuePushNavigation(target);
      });

      
    } catch (error) {
      logger.error("[OneSignal] Native init error:", error);
      setPlatformSupport({ 
        supported: false, 
        reason: "Failed to initialize push notifications",
        canRetry: true 
      });
      setIsLoading(false);
    }
  }, []);

  // Initialize Web OneSignal SDK
  const initWebOneSignal = useCallback(async () => {
    logger.log("[OneSignal] Initializing web SDK...");
    
    const support = checkWebPlatformSupport();
    setPlatformSupport(support);
    
    if (!support.supported && !support.canRetry) {
      logger.log("[OneSignal] Web platform not supported:", support.reason);
      setIsLoading(false);
      return;
    }

    // Skip web service worker on native — Capacitor WebView doesn't use SW,
    // and OneSignal native plugin handles push registration on iOS/Android.
    if (!isNative() && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.ready;
        logger.log("[OneSignal] Service worker ready");
      } catch (e) {
        logger.log("[OneSignal] Service worker not ready yet");
      }
    }

    if (!window.OneSignal) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
      
      logger.log("[OneSignal] Web SDK script added");

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          logger.log("[OneSignal] Calling web init()...");
          
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
          });
          
          logger.log("[OneSignal] Web initialized successfully");
          setIsReady(true);
          await checkWebSubscriptionStatus(OneSignal);
        } catch (error) {
          logger.error("[OneSignal] Web init error:", error);
          setIsLoading(false);
        }
      });
    } else {
      logger.log("[OneSignal] Web SDK already loaded");
      setIsReady(true);
      await checkWebSubscriptionStatus(window.OneSignal);
    }
  }, [checkWebPlatformSupport]);

  const checkWebSubscriptionStatus = async (OneSignal: any) => {
    try {
      logger.log("[OneSignal] Checking web subscription status...");
      
      const permission = await OneSignal.Notifications.permission;
      const id = await OneSignal.User.PushSubscription.id;
      const optedIn = await OneSignal.User.PushSubscription.optedIn;
      
      logger.log("[OneSignal] Web status - Permission:", permission, "ID:", id, "OptedIn:", optedIn);
      
      setIsSubscribed(permission && !!id && optedIn);
      setPlayerId(id || null);
      setIsLoading(false);
    } catch (error) {
      logger.error("[OneSignal] Web status check error:", error);
      setIsLoading(false);
    }
  };

  // Main initialization effect
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    logger.log("[OneSignal] Starting initialization, isNative:", isNative());
    
    if (isNative()) {
      initNativeOneSignal();
    } else {
      initWebOneSignal();
    }
    
    const timeout = setTimeout(() => {
      if (isLoading) {
        logger.log("[OneSignal] Init timeout reached");
        setIsLoading(false);
      }
    }, 15000);
    
    return () => clearTimeout(timeout);
  }, [initNativeOneSignal, initWebOneSignal, isLoading]);

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
          const deviceType = isNative() 
            ? (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')
            : (/mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "mobile" : "web");
          
          const { error } = await supabase.from("push_subscriptions").insert({
            user_id: user.id,
            onesignal_player_id: playerId,
            device_type: deviceType,
          });

          if (error && error.code !== "23505") {
            logger.error("[OneSignal] DB sync error:", error);
          }
        }
      } catch (error) {
        logger.error("[OneSignal] Sync error:", error);
      }
    };

    syncPlayerId();
  }, [user?.id, playerId]);

  // Subscribe - handles both native and web
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!platformSupport.supported) {
      logger.log("[OneSignal] Cannot subscribe - platform not supported");
      return false;
    }

    try {
      setIsLoading(true);
      logger.log("[OneSignal] Starting subscription, isNative:", isNative());
      
      if (isNative() && nativeOneSignal) {
        const granted = await nativeOneSignal.Notifications.requestPermission(true);
        logger.log("[OneSignal] Native permission result:", granted);
        
        if (!granted) {
          setPlatformSupport({
            supported: false,
            reason: "Permiso de notificaciones denegado. Habilítalo en configuración.",
            canRetry: false,
          });
          setIsLoading(false);
          return false;
        }
        
        nativeOneSignal.User.pushSubscription.optIn();
        
        for (let i = 0; i < 30; i++) {
          const id = await nativeOneSignal.User.pushSubscription.getIdAsync();
          const optedIn = await nativeOneSignal.User.pushSubscription.getOptedInAsync();
          
          logger.log(`[OneSignal] Native poll ${i + 1}: ID=${id}, OptedIn=${optedIn}`);
          
          if (id && optedIn) {
            setIsSubscribed(true);
            setPlayerId(id);
            
            if (user?.id) {
              await supabase.from("push_subscriptions").upsert({
                user_id: user.id,
                onesignal_player_id: id,
                device_type: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
              }, {
                onConflict: "user_id,onesignal_player_id",
              });
            }
            
            setIsLoading(false);
            return true;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        logger.log("[OneSignal] Native subscription timed out");
        setIsLoading(false);
        return false;
        
      } else {
        if (!window.OneSignal || !isReady) {
          logger.log("[OneSignal] Cannot subscribe - web SDK not ready");
          setIsLoading(false);
          return false;
        }
        
        await window.OneSignal.User.PushSubscription.optIn();
        logger.log("[OneSignal] Web optIn completed");
        
        for (let i = 0; i < 30; i++) {
          const id = await window.OneSignal.User.PushSubscription.id;
          const permission = await window.OneSignal.Notifications.permission;
          const optedIn = await window.OneSignal.User.PushSubscription.optedIn;
          
          logger.log(`[OneSignal] Web poll ${i + 1}: permission=${permission}, id=${id}, optedIn=${optedIn}`);
          
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
            logger.log("[OneSignal] Web permission denied by user");
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
        
        logger.log("[OneSignal] Web subscription timed out");
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      logger.error("[OneSignal] Subscribe error:", error);
      setIsLoading(false);
      return false;
    }
  }, [user?.id, platformSupport.supported, isReady]);

  // Unsubscribe - handles both native and web
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      logger.log("[OneSignal] Unsubscribing, isNative:", isNative());
      
      if (isNative() && nativeOneSignal) {
        nativeOneSignal.User.pushSubscription.optOut();
      } else {
        if (!window.OneSignal) {
          setIsLoading(false);
          return false;
        }
        
        await window.OneSignal.User.PushSubscription.optOut();
      }
      
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
      logger.error("[OneSignal] Unsubscribe error:", error);
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
