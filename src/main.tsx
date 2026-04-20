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
// Uses a fully dynamic import so the build does not require @capacitor/status-bar
// to be installed in web-only contexts.
if (Capacitor.isNativePlatform()) {
  // Opaque specifier prevents Vite from trying to resolve the module at build time.
  // The plugin is only present in native builds; web builds skip this entirely.
  const statusBarModule = "@capacitor/status-bar";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (new Function("m", "return import(m)")(statusBarModule) as Promise<any>)
    .then((mod) => {
      const { StatusBar, Style } = mod;
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
