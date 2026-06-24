import { supabase } from "@/integrations/supabase/client";

// Signal weights for documentation / client-side reference only.
// The actual scoring happens server-side in the `derive-preferences` worker
// (Instagram/Pinterest pattern: the client logs raw events, the backend
// derives scores asynchronously).
export const SIGNAL_WEIGHTS = {
  join: 100,
  save: 80,
  repost: 70,
  like: 60,
  click: 30,
  not_interested: -100,
} as const;

// Legacy signal types kept in the type union so existing call sites compile,
// but `view`, `dwell`, and `scroll_past` are dropped on the client (Pinterest
// discards these too — the cost/benefit isn't there for sub-second signals).
export type SignalType =
  | keyof typeof SIGNAL_WEIGHTS
  | "view"
  | "dwell"
  | "scroll_past";

const ACCEPTED: ReadonlySet<string> = new Set([
  "join",
  "save",
  "repost",
  "like",
  "click",
  "not_interested",
]);

/**
 * Append a single interaction to the server-side log.
 *
 * One row, one network call, fire-and-forget. The `derive-preferences`
 * background worker aggregates the log every few minutes and updates the
 * `user_*_preferences` tables in batch.
 */
export const trackPreferenceSignal = async (
  userId: string,
  eventId: string,
  signalType: SignalType,
) => {
  // Drop low-signal types on the client — same as Pinterest/TikTok do.
  if (!ACCEPTED.has(signalType)) return;

  try {
    await supabase.rpc("log_interaction", {
      _event_id: eventId,
      _signal_type: signalType,
    });
  } catch (error) {
    // Never break the UI on a tracking failure.
    console.error("[preferenceTracking] log_interaction failed:", error);
  }
};
