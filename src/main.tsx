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
// Dynamically imported so web builds never load the native plugin.
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) => {
      StatusBar?.setStyle?.({ style: Style.Dark }).catch(() => {});
      if (Capacitor.getPlatform() === "ios") {
        StatusBar?.setOverlaysWebView?.({ overlay: false }).catch(() => {});
      }
    })
    .catch(() => {
      // Plugin not installed in this build — fail silently.
    });
}

// Note: StrictMode is disabled because keepalive-for-react requires it for page caching
createRoot(document.getElementById("root")!).render(<App />);

// Remove the boot splash once React has mounted AND a minimum display time has elapsed.
// 600ms feels intentional without being sluggish; on native the OS splash covers cold boot,
// so we skip the extra delay there.
const SPLASH_MIN_MS = Capacitor.isNativePlatform() ? 0 : 600;
const bootStart = performance.now();
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("app-splash");
    if (!splash) return;
    const elapsed = performance.now() - bootStart;
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
    setTimeout(() => {
      splash.classList.add("is-hiding");
      setTimeout(() => splash.remove(), 300);
    }, wait);
  });
});


