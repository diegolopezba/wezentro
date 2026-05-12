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
  business_type: string | null;
}

/**
 * Fetch business profiles whose `business_type` matches one of the given types
 * AND that have pinned business coordinates. Used to render business pins on
 * the Discover map when matching category pills are selected.
 */
export const useFoodLocations = (types: string[] = []) => {
  // Stable key: sorted, unique
  const normalizedTypes = Array.from(new Set(types)).sort();

  return useQuery({
    queryKey: ["business-locations", normalizedTypes],
    enabled: normalizedTypes.length > 0,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, bio, business_latitude, business_longitude, business_address, business_type",
        )
        .in("business_type", normalizedTypes)
        .not("business_latitude", "is", null)
        .not("business_longitude", "is", null);

      if (error) throw error;

      return (profiles || []).map((profile) => ({
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        business_latitude: profile.business_latitude!,
        business_longitude: profile.business_longitude!,
        business_address: profile.business_address,
        business_type: profile.business_type,
      })) as FoodLocation[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
