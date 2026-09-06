import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { LandingProvider } from "@/components/landing/LandingContext";

/**
 * Browser-only commercial landing. Inside the native app the marketing pages
 * are never shown (store guidelines + the app already targets buyers), so we
 * bounce straight to the feed.
 */
const LandingRoot = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) navigate("/", { replace: true });
  }, [navigate]);

  if (Capacitor.isNativePlatform()) return null;

  return (
    <LandingProvider>
      <Outlet />
    </LandingProvider>
  );
};

export default LandingRoot;
