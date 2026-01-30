import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserPreferences {
  categories: Record<string, number>;
  creators: Record<string, number>;
}

/**
 * Calculate time decay factor based on last interaction date.
 * Recent interactions: 100% weight
 * 7-30 days: 70% weight
 * 30-90 days: 40% weight
 * 90+ days: 20% weight
 */
const getDecayFactor = (lastInteraction: string | null): number => {
  if (!lastInteraction) return 0.2;

  const daysSince = Math.floor(
    (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince <= 7) return 1.0;
  if (daysSince <= 30) return 0.7;
  if (daysSince <= 90) return 0.4;
  return 0.2;
};

/**
 * Fetch user's learned preferences for the For You algorithm.
 * Applies time decay to scores so recent preferences are weighted more heavily.
 */
export const useUserPreferences = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async (): Promise<UserPreferences> => {
      if (!userId) {
        return { categories: {}, creators: {} };
      }

      // Fetch category preferences
      const { data: categoryData, error: categoryError } = await supabase
        .from("user_category_preferences")
        .select("category, score, last_interaction")
        .eq("user_id", userId);

      if (categoryError) {
        console.error("Error fetching category preferences:", categoryError);
      }

      // Fetch creator preferences
      const { data: creatorData, error: creatorError } = await supabase
        .from("user_creator_preferences")
        .select("creator_id, score, last_interaction")
        .eq("user_id", userId);

      if (creatorError) {
        console.error("Error fetching creator preferences:", creatorError);
      }

      // Apply decay and convert to lookup objects
      const categories: Record<string, number> = {};
      const creators: Record<string, number> = {};

      if (categoryData) {
        for (const pref of categoryData) {
          const decay = getDecayFactor(pref.last_interaction);
          categories[pref.category] = Number(pref.score) * decay;
        }
      }

      if (creatorData) {
        for (const pref of creatorData) {
          const decay = getDecayFactor(pref.last_interaction);
          creators[pref.creator_id] = Number(pref.score) * decay;
        }
      }

      return { categories, creators };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
