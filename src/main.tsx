import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Initialize production logger (suppresses console.log in production)
import "./lib/logger";

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Unhandled Rejection]", event.reason);
  // Prevent the default browser error logging for handled cases
  if (event.reason?.message?.includes("Failed to fetch")) {
    event.preventDefault();
  }
});

// Note: StrictMode is disabled because keepalive-for-react requires it for page caching
createRoot(document.getElementById("root")!).render(<App />);