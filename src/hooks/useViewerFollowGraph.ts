import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ViewerFollowGraph {
  followingIds: Set<string>;
  scoreMap: Record<string, number>;
}

const EMPTY: ViewerFollowGraph = { followingIds: new Set(), scoreMap: {} };

/**
 * Cached lookup of the current viewer's following set + interaction scores
 * per followed creator. Used to prioritize attendee avatars on event cards
 * and details (followed users shown first, ordered by score desc).
 */
export const useViewerFollowGraph = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["viewer-follow-graph", user?.id],
    queryFn: async (): Promise<ViewerFollowGraph> => {
      if (!user?.id) return EMPTY;

      const [{ data: follows }, { data: prefs }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase
          .from("user_creator_preferences")
          .select("creator_id, score")
          .eq("user_id", user.id),
      ]);

      const followingIds = new Set<string>(
        (follows || []).map((f: any) => f.following_id as string)
      );
      const scoreMap: Record<string, number> = Object.fromEntries(
        (prefs || []).map((p: any) => [p.creator_id as string, Number(p.score) || 0])
      );

      return { followingIds, scoreMap };
    },
    staleTime: 5 * 60 * 1000,
    enabled: true,
    placeholderData: EMPTY,
  });
};
