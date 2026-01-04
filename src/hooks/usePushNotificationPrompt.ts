import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const PROMPT_DELAY_MS = 4000; // Wait 4 seconds after page load
const PROMPTED_KEY = "push_notification_prompted";

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

const isPlatformSupported = (): boolean => {
  // Check if Notification API is available
  if (!('Notification' in window)) return false;
  
  // Check if permission was previously denied
  if (Notification.permission === 'denied') return false;
  
  // iOS-specific checks
  if (isIOS()) {
    const iosVersion = getIOSVersion();
    if (iosVersion < 16) return false;
    if (!isPWA()) return false;
  }
  
  return true;
};

export const usePushNotificationPrompt = () => {
  const { user } = useAuth();
  const hasPrompted = useRef(false);
  
  useEffect(() => {
    // Only prompt once per session, and only if user is logged in
    if (!user?.id || hasPrompted.current) return;
    
    // Check if already prompted before (in localStorage)
    const alreadyPrompted = localStorage.getItem(PROMPTED_KEY);
    if (alreadyPrompted) {
      console.log("[PushPrompt] User was already prompted before");
      return;
    }
    
    // Check platform support
    if (!isPlatformSupported()) {
      console.log("[PushPrompt] Platform not supported for auto-prompt");
      return;
    }
    
    // Check if already subscribed (permission already granted)
    if (Notification.permission === 'granted') {
      console.log("[PushPrompt] Already has permission, skipping prompt");
      localStorage.setItem(PROMPTED_KEY, "true");
      return;
    }
    
    const promptForNotifications = async () => {
      hasPrompted.current = true;
      
      console.log("[PushPrompt] Starting auto-prompt flow...");
      
      // Initialize OneSignal if not already done
      if (!window.OneSignal) {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);
        
        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            await OneSignal.init({
              appId: ONESIGNAL_APP_ID,
              allowLocalhostAsSecureOrigin: true,
            });
            
            console.log("[PushPrompt] OneSignal initialized, triggering opt-in...");
            
            // This triggers the native permission prompt
            await OneSignal.User.PushSubscription.optIn();
            
            // Mark as prompted regardless of outcome
            localStorage.setItem(PROMPTED_KEY, "true");
            console.log("[PushPrompt] Prompt flow completed");
          } catch (error) {
            console.error("[PushPrompt] Error during prompt:", error);
            localStorage.setItem(PROMPTED_KEY, "true");
          }
        });
      } else {
        // OneSignal already loaded
        try {
          console.log("[PushPrompt] OneSignal already loaded, triggering opt-in...");
          await window.OneSignal.User.PushSubscription.optIn();
          localStorage.setItem(PROMPTED_KEY, "true");
        } catch (error) {
          console.error("[PushPrompt] Error during prompt:", error);
          localStorage.setItem(PROMPTED_KEY, "true");
        }
      }
    };
    
    // Delay the prompt for better UX
    const timeout = setTimeout(promptForNotifications, PROMPT_DELAY_MS);
    
    return () => clearTimeout(timeout);
  }, [user?.id]);
};
