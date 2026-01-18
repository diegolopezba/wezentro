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
}

export const useUserTimeline = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-timeline", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          guestlist_entries(count)
        `)
        .eq("creator_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TimelineItem[];
    },
    enabled: !!userId,
  });
};
