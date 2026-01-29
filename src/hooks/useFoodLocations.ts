import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FoodLocation {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  business_latitude: number;
  business_longitude: number;
  business_address: string | null;
  business_type: "restaurant" | "cafe" | null;
}

export const useFoodLocations = () => {
  return useQuery({
    queryKey: ["food-locations"],
    queryFn: async () => {
      // Get profiles that have is_food_business = true and have location set
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, business_latitude, business_longitude, business_address, business_type")
        .eq("is_food_business", true)
        .not("business_latitude", "is", null)
        .not("business_longitude", "is", null);

      if (profilesError) throw profilesError;

      // Verify each profile has an active food_premium subscription
      const validLocations: FoodLocation[] = [];

      for (const profile of profiles || []) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", profile.id)
          .eq("plan_type", "food_premium")
          .in("status", ["active", "trialing"])
          .maybeSingle();

        if (subscription) {
          validLocations.push({
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            business_latitude: profile.business_latitude!,
            business_longitude: profile.business_longitude!,
            business_address: profile.business_address,
            business_type: (profile as any).business_type as "restaurant" | "cafe" | null,
          });
        }
      }

      return validLocations;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
