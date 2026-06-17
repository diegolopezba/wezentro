import { supabase } from "@/integrations/supabase/client";

/**
 * Track when a user views an event
 * Only tracks once per user per event (using upsert behavior)
 */
export const trackEventView = async (eventId: string, userId: string | null) => {
  if (!userId) return;

  try {
    // Check if already tracked today to avoid spam
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("event_interactions")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("type", "view")
      .gte("created_at", today)
      .maybeSingle();

    if (existing) {
      // Already tracked today
      return;
    }

    await supabase.from("event_interactions").insert({
      event_id: eventId,
      user_id: userId,
      type: "view",
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.error("Failed to track event view:", error);
  }
};

/**
 * Track when a user shares an event
 */
export const trackEventShare = async (eventId: string, userId: string | null) => {
  if (!userId) return;

  try {
    await supabase.from("event_interactions").insert({
      event_id: eventId,
      user_id: userId,
      type: "share",
    });
  } catch (error) {
    console.error("Failed to track event share:", error);
  }
};

/**
 * Track when a user visits a business profile
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

    // Silently ignore duplicate-key violations from the daily unique index
    if (insertError && insertError.code !== "23505") {
      console.error("Failed to track profile visit:", insertError);
    }
  } catch (error) {
    console.error("Failed to track profile visit:", error);
  }
};

/**
 * Track when a user views a menu
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
 * Track when a user taps the reserve button
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
 * - In-memory session dedupe avoids spamming on scroll re-entries.
 * - Daily DB dedupe avoids inflating counts across reloads.
 */
const impressionSessionCache = new Set<string>();

export const trackEventImpression = async (eventId: string, userId: string | null) => {
  // Session-level dedupe key: per-event for anon, per-user-per-event for logged-in.
  const key = `${eventId}:${userId ?? "anon"}`;
  if (impressionSessionCache.has(key)) return;
  impressionSessionCache.add(key);

  try {
    // Daily DB dedupe only applies to logged-in users (anon rows have null user_id).
    if (userId) {
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("event_interactions")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .eq("type", "impression")
        .gte("created_at", today)
        .maybeSingle();

      if (existing) return;
    }

    await supabase.from("event_interactions").insert({
      event_id: eventId,
      user_id: userId,
      type: "impression",
    });
  } catch (error) {
    console.error("Failed to track event impression:", error);
  }
};
