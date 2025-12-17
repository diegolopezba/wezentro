import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  eventsCount: number;
  followersCount: number;
  followingCount: number;
}

export const useUserStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async (): Promise<UserStats> => {
      if (!userId) throw new Error("User ID required");

      const [eventsResult, followersResult, followingResult] = await Promise.all([
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", userId)
          .is("deleted_at", null),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", userId),
      ]);

      return {
        eventsCount: eventsResult.count || 0,
        followersCount: followersResult.count || 0,
        followingCount: followingResult.count || 0,
      };
    },
    enabled: !!userId,
  });
};
