import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * Handles Android hardware back button for native app experience.
 * - If on a detail page, navigates back
 * - If on a main tab, shows exit confirmation or minimizes app
 */
export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const mainTabs = ["/", "/discover", "/create", "/profile"];
    const isMainTab = mainTabs.includes(location.pathname);

    const handleBackButton = () => {
      if (isMainTab) {
        // On main tabs, minimize the app instead of navigating
        App.minimizeApp();
      } else {
        // On detail pages, navigate back
        navigate(-1);
      }
    };

    const listener = App.addListener("backButton", handleBackButton);

    return () => {
      listener.then((l) => l.remove());
    };
  }, [navigate, location.pathname]);
};
