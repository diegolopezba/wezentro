import { supabase } from "@/integrations/supabase/client";

// Signal weights for learning user preferences
export const SIGNAL_WEIGHTS = {
  join: 100,   // Strongest signal - real commitment
  save: 80,    // High intent to attend
  repost: 70,  // Willing to share publicly
  like: 60,    // Clear positive signal
  click: 30,   // Curiosity
  view: 20,    // Mild interest
  not_interested: -100, // Strong negative signal
} as const;

export type SignalType = keyof typeof SIGNAL_WEIGHTS;

/**
 * Track a preference signal for a user based on their interaction with an event.
 * Updates both category and creator preferences.
 * 
 * This function is fire-and-forget - errors are logged but don't block the UI.
 */
export const trackPreferenceSignal = async (
  userId: string,
  eventId: string,
  signalType: SignalType
) => {
  try {
    // 1. Record the interaction in event_interactions
    await supabase.from("event_interactions").insert({
      event_id: eventId,
      user_id: userId,
      type: signalType,
    });

    // 2. Get event details (category and creator)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("category, creator_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.warn("[preferenceTracking] Could not fetch event details:", eventError);
      return;
    }

    const weight = SIGNAL_WEIGHTS[signalType];
    const now = new Date().toISOString();

    // For negative signals, use absolute value for the math but penalize
    const isNegative = weight < 0;

    // 3. Update category preference if event has a category
    if (event.category) {
      await upsertCategoryPreference(userId, event.category, weight, now, isNegative);
    }

    // 4. Update creator preference (don't track self-interactions)
    if (event.creator_id && event.creator_id !== userId) {
      await upsertCreatorPreference(userId, event.creator_id, weight, now, isNegative);
    }
  } catch (error) {
    // Don't throw - this is a background operation
    console.error("[preferenceTracking] Error tracking preference:", error);
  }
};

/**
 * Upsert a category preference score using incremental averaging
 */
const upsertCategoryPreference = async (
  userId: string,
  category: string,
  weight: number,
  timestamp: string,
  isNegative: boolean = false
) => {
  // First, try to get existing record
  const { data: existing } = await supabase
    .from("user_category_preferences")
    .select("id, score, interaction_count")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();

  if (existing) {
    const newCount = (existing.interaction_count || 0) + 1;
    const currentScore = Number(existing.score) || 0;
    // For negative signals, aggressively reduce score
    const newScore = isNegative
      ? Math.max(0, currentScore - 30) // Hard penalty
      : (currentScore * 0.7) + (weight * 0.3);

    await supabase
      .from("user_category_preferences")
      .update({
        score: Math.min(100, Math.max(0, newScore)),
        interaction_count: newCount,
        last_interaction: timestamp,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_category_preferences").insert({
      user_id: userId,
      category,
      score: isNegative ? 0 : weight,
      interaction_count: 1,
      last_interaction: timestamp,
    });
  }
};

/**
 * Upsert a creator preference score using incremental averaging
 */
const upsertCreatorPreference = async (
  userId: string,
  creatorId: string,
  weight: number,
  timestamp: string,
  isNegative: boolean = false
) => {
  // First, try to get existing record
  const { data: existing } = await supabase
    .from("user_creator_preferences")
    .select("id, score, interaction_count")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (existing) {
    const newCount = (existing.interaction_count || 0) + 1;
    const currentScore = Number(existing.score) || 0;
    const newScore = isNegative
      ? Math.max(0, currentScore - 30)
      : (currentScore * 0.7) + (weight * 0.3);

    await supabase
      .from("user_creator_preferences")
      .update({
        score: Math.min(100, Math.max(0, newScore)),
        interaction_count: newCount,
        last_interaction: timestamp,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_creator_preferences").insert({
      user_id: userId,
      creator_id: creatorId,
      score: isNegative ? 0 : weight,
      interaction_count: 1,
      last_interaction: timestamp,
    });
  }
};
