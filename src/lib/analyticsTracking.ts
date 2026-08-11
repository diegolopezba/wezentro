import { supabase } from "@/integrations/supabase/client";
import { enqueueImpression } from "./impressionQueue";

/**
 * Track when a user opens an event detail page.
 *
 * Routed through the impression queue (TikTok/Pinterest SDK pattern): the
 * client buffers events in localStorage and the `ingest-impressions` edge
 * function bumps the denormalized `event_stats.view_count`. No per-call DB
 * round-trip, no SELECT-then-INSERT.
 */
export const trackEventView = async (eventId: string, userId: string | null) => {
  if (!userId) return;
  enqueueImpression(eventId, "view");
};

/**
 * Track when a user shares an event.
 *
 * Currently a no-op: the social-graph signal is already captured by
 * `reposts` and `event_likes`, and a dedicated share counter is not surfaced
 * anywhere. Kept as a stable export so call sites don't need to change.
 */
export const trackEventShare = async (_eventId: string, _userId: string | null) => {
  // no-op
};

/**
 * Track when a user visits a business profile (kept — low volume, used by
 * profile-visit analytics and the daily unique index dedupes).
 */
export const trackProfileVisit = async (profileId: string, visitorId: string | null) => {
  if (!visitorId || visitorId === profileId) return;

  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("profile_visits")
      .select("id")
      .eq("profile_id", profileId)
      .eq("visitor_id", visitorId)
      .gte("created_at", today)
      .maybeSingle();

    if (existing) return;

    const { error: insertError } = await supabase.from("profile_visits").insert({
      profile_id: profileId,
      visitor_id: visitorId,
    });

    if (insertError && insertError.code !== "23505") {
      console.error("Failed to track profile visit:", insertError);
    }
  } catch (error) {
    console.error("Failed to track profile visit:", error);
  }
};

/**
 * Track an explicit menu-button tap (kept — rare, used by business dashboard).
 */
export const trackMenuView = async (eventId: string, userId: string | null) => {
  if (!userId) return;
  try {
    await supabase.from("event_interactions").insert({
      event_id: eventId,
      user_id: userId,
      type: "menu_view",
    });
  } catch (error) {
    console.error("Failed to track menu view:", error);
  }
};

/**
 * Track an explicit reserve-button tap (kept — rare, used by business dashboard).
 */
export const trackReserveTap = async (eventId: string, userId: string | null) => {
  if (!userId) return;
  try {
    await supabase.from("event_interactions").insert({
      event_id: eventId,
      user_id: userId,
      type: "reserve_tap",
    });
  } catch (error) {
    console.error("Failed to track reserve tap:", error);
  }
};

/**
 * Track when a card was actually seen in a feed/profile/chat (passive impression).
 *
 * Batched + persisted via `impressionQueue` (TikTok/Pinterest SDK pattern).
 */
export const trackEventImpression = async (eventId: string, _userId: string | null) => {
  enqueueImpression(eventId, "impression");
};

/**
 * Track a "Comprar" / "Unirme" tap on an event detail (page or overlay).
 *
 * Low volume (one row per real intent tap) and timestamped, so it powers the
 * period-scoped middle stage of the conversion funnel.
 */
export const trackCheckoutTap = async (eventId: string, userId: string | null) => {
  if (!userId) return;
  try {
    await supabase.from("event_interactions").insert({
      event_id: eventId,
      user_id: userId,
      type: "checkout_tap",
    });
  } catch (error) {
    console.error("Failed to track checkout tap:", error);
  }
};
