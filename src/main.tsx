import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Initialize production logger (suppresses console.log in production)
import "./lib/logger";
import { Capacitor } from "@capacitor/core";

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Unhandled Rejection]", event.reason);
  // Prevent the default browser error logging for handled cases
  if (event.reason?.message?.includes("Failed to fetch")) {
    event.preventDefault();
  }
});

// Configure native status bar once at boot (Capacitor only).
// Dark style with overlay so the WebView paints the safe-area background itself.
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      // overlaysWebView is iOS-only — guard.
      if (Capacitor.getPlatform() === "ios") {
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      }
    })
    .catch(() => {
      // Plugin may not be installed in this build target — fail silently.
    });
}

// Note: StrictMode is disabled because keepalive-for-react requires it for page caching
createRoot(document.getElementById("root")!).render(<App />);
