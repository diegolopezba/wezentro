import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignal } from "@/contexts/OneSignalContext";
import { logger } from "@/lib/logger";

const PROMPT_DELAY_MS = 5000; // Wait 5 seconds after everything is ready
const PROMPTED_KEY = "push_notification_prompted_v2"; // Versioned key to force re-prompt

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

// Async platform check with retry for iOS PWA detection
const checkPlatformSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const check = () => {
      logger.log("[PushPrompt] Platform check - Notification API:", 'Notification' in window);
      logger.log("[PushPrompt] Platform check - iOS:", isIOS(), "PWA:", isPWA());
      
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'denied') return false;
      
      if (isIOS()) {
        const iosVersion = getIOSVersion();
        logger.log("[PushPrompt] iOS version:", iosVersion);
        if (iosVersion < 16) return false;
        if (!isPWA()) return false;
      }
      
      return true;
    };
    
    const result = check();
    if (result) {
      logger.log("[PushPrompt] Platform supported on first check");
      resolve(true);
    } else if (isIOS()) {
      // On iOS, PWA detection might fail initially - retry after a delay
      logger.log("[PushPrompt] iOS detected, will retry PWA check in 1.5s...");
      setTimeout(() => {
        const retryResult = check();
        logger.log("[PushPrompt] iOS retry result:", retryResult);
        resolve(retryResult);
      }, 1500);
    } else {
      logger.log("[PushPrompt] Platform not supported");
      resolve(false);
    }
  });
};

export const usePushNotificationPrompt = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { isReady, isSubscribed, subscribe } = useOneSignal();
  const hasPrompted = useRef(false);
  
  useEffect(() => {
    // Wait for auth to fully load
    if (authLoading) {
      logger.log("[PushPrompt] Waiting for auth to load...");
      return;
    }
    
    if (!user?.id) {
      logger.log("[PushPrompt] No user logged in");
      return;
    }
    
    if (!profile) {
      logger.log("[PushPrompt] No profile yet (onboarding not complete)");
      return;
    }
    
    if (hasPrompted.current) {
      logger.log("[PushPrompt] Already prompted this session");
      return;
    }
    
    const alreadyPrompted = localStorage.getItem(PROMPTED_KEY);
    if (alreadyPrompted) {
      logger.log("[PushPrompt] User was already prompted before (localStorage)");
      return;
    }
    
    if (isSubscribed) {
      logger.log("[PushPrompt] Already subscribed, skipping prompt");
      localStorage.setItem(PROMPTED_KEY, "true");
      return;
    }
    
    if (!isReady) {
      logger.log("[PushPrompt] Waiting for OneSignal to be ready...");
      return;
    }
    
    const promptForNotifications = async () => {
      logger.log("[PushPrompt] Checking platform support...");
      
      const platformSupported = await checkPlatformSupport();
      if (!platformSupported) {
        logger.log("[PushPrompt] Platform not supported, skipping prompt");
        return;
      }
      
      hasPrompted.current = true;
      
      logger.log("[PushPrompt] All conditions met! Triggering native prompt...");
      
      try {
        const success = await subscribe();
        logger.log("[PushPrompt] Subscribe result:", success);
        localStorage.setItem(PROMPTED_KEY, "true");
      } catch (error) {
        logger.error("[PushPrompt] Error during prompt:", error);
        localStorage.setItem(PROMPTED_KEY, "true");
      }
    };
    
    logger.log("[PushPrompt] Scheduling prompt in", PROMPT_DELAY_MS, "ms...");
    const timeout = setTimeout(promptForNotifications, PROMPT_DELAY_MS);
    
    return () => clearTimeout(timeout);
  }, [user?.id, profile, authLoading, isReady, isSubscribed, subscribe]);
};
