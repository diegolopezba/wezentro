import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignal } from "@/contexts/OneSignalContext";
import { logger } from "@/lib/logger";

const PROMPT_DELAY_MS = 4000; // Show explainer ~4s after ready
const PROMPTED_KEY = "push_notification_prompted_v3"; // Bumped: now uses pre-prompt explainer

const isNative = () => Capacitor.isNativePlatform();

const isPWA = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

const getIOSVersion = (): number => {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
};

const checkPlatformSupport = (): Promise<boolean> =>
  new Promise((resolve) => {
    // Native builds: the OneSignal native SDK owns permission state, the
    // web-only checks below (window.Notification, installed-PWA) never hold
    // inside a Capacitor WebView and would silently suppress the prompt.
    if (isNative()) {
      resolve(true);
      return;
    }

    const check = () => {
      if (!("Notification" in window)) return false;
      if (Notification.permission === "denied") return false;
      if (isIOS()) {
        const v = getIOSVersion();
        if (v < 16) return false;
        if (!isPWA()) return false;
      }
      return true;
    };
    const r = check();
    if (r) resolve(true);
    else if (isIOS()) setTimeout(() => resolve(check()), 1500);
    else resolve(false);
  });


/**
 * Apple App Store Guideline 5.1.1(ii) compliance:
 * We must explain why we want notifications BEFORE triggering the
 * native iOS permission prompt. This hook returns visibility state
 * for an in-app explainer; the native prompt is only fired when the
 * user taps "Activar".
 */
export const usePushNotificationPrompt = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { isReady, isSubscribed, subscribe } = useOneSignal();
  const [showExplainer, setShowExplainer] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (authLoading || !user?.id || !profile) return;
    if (localStorage.getItem(PROMPTED_KEY)) return;
    if (isSubscribed) {
      localStorage.setItem(PROMPTED_KEY, "true");
      return;
    }
    if (!isReady) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const ok = await checkPlatformSupport();
      if (cancelled || !ok) return;
      setShowExplainer(true);
    }, PROMPT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [user?.id, profile, authLoading, isReady, isSubscribed]);

  const accept = async () => {
    setIsAccepting(true);
    try {
      const ok = await subscribe();
      logger.log("[PushPrompt] Subscribe result:", ok);
    } catch (e) {
      logger.error("[PushPrompt] Error during subscribe:", e);
    } finally {
      localStorage.setItem(PROMPTED_KEY, "true");
      setShowExplainer(false);
      setIsAccepting(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(PROMPTED_KEY, "true");
    setShowExplainer(false);
  };

  return { showExplainer, isAccepting, accept, dismiss };
};
