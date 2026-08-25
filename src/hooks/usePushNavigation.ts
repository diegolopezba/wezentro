import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setPushNavigationListener } from "@/lib/pushNavigation";

/**
 * Routes the app to the target of a tapped push notification, including
 * taps that happened during a cold start (queued before the router mounted).
 */
export const usePushNavigation = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setPushNavigationListener((path) => navigate(path));
    return () => setPushNavigationListener(null);
  }, [navigate]);
};
