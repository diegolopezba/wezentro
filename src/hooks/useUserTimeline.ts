import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimelineItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  price: number | null;
  has_guestlist: boolean | null;
  max_guestlist_capacity: number | null;
  is_public: boolean | null;
  is_post: boolean | null;
  creator_id: string;
  created_at: string | null;
  creator?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  guestlist_entries?: { count: number }[];
  media?: { id: string; media_url: string; media_type: string; display_order: number; aspect_ratio: number | null }[];
}

export const useUserTimeline = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-timeline", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      const selectFields = `
        *,
        creator:profiles!events_creator_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        guestlist_entries(count)
      `;

      // Fetch own posts and accepted tagged posts in parallel
      const [ownResult, taggedResult] = await Promise.all([
        supabase
          .from("events")
          .select(selectFields)
          .eq("creator_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("event_tags")
          .select(`event:events(${selectFields})`)
          .eq("tagged_user_id", userId)
          .eq("status", "accepted"),
      ]);

      if (ownResult.error) throw ownResult.error;
      if (taggedResult.error) throw taggedResult.error;

      const ownPosts = (ownResult.data || []) as TimelineItem[];
      const taggedPosts = ((taggedResult.data || [])
        .map((t: any) => t.event)
        .filter((e: any) => e && !e.deleted_at)) as TimelineItem[];

      // Merge and deduplicate by id, sort by created_at desc
      const seen = new Set<string>();
      const merged: TimelineItem[] = [];
      for (const post of [...ownPosts, ...taggedPosts]) {
        if (!seen.has(post.id)) {
          seen.add(post.id);
          merged.push(post);
        }
      }
      merged.sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());

      return merged;
    },
    enabled: !!userId,
  });
};
