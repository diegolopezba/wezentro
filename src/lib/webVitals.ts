/**
 * Real User Monitoring (RUM) — sends Core Web Vitals to Supabase.
 * Init once in App.tsx. Big-tech pattern: sample a small fraction of sessions
 * (Pinterest/Instagram sample at ~1–10%), never log 100% of pageviews.
 */
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

let initialized = false;

// 10% session sampling — decided once per session, then reused for every metric
// so a given session is either fully captured or fully skipped.
const SAMPLE_RATE = 0.1;
const sessionSampled =
  typeof window !== "undefined" ? Math.random() < SAMPLE_RATE : false;

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

  // Never write metrics from dev / preview — saves cost and keeps prod data clean.
  if (import.meta.env.DEV) return;

  // Session-level sampling: only 10% of sessions report metrics.
  if (!sessionSampled) return;

  onLCP(report);
  onINP(report);
  onCLS(report);
  onFCP(report);
  onTTFB(report);
}
