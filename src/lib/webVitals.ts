/**
 * Real User Monitoring (RUM) — sends Core Web Vitals to Supabase.
 * Init once in App.tsx. Uses sendBeacon when available so reports survive page unload.
 */
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

let initialized = false;

async function report(metric: Metric) {
  try {
    const { data } = await supabase.auth.getSession();
    const user_id = data.session?.user.id ?? null;

    await supabase.from("web_vitals").insert({
      user_id,
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      navigation_type: metric.navigationType,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      is_native: Capacitor.isNativePlatform(),
    });
  } catch {
    // RUM must never break the app
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[web-vitals] ${metric.name}=${Math.round(metric.value)} (${metric.rating})`);
  }
}

export function initWebVitals() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  onLCP(report);
  onINP(report);
  onCLS(report);
  onFCP(report);
  onTTFB(report);
}
