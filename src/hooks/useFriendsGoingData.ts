import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shared "friends going" data used by the friendsGoingOnly filter
 * (Discover map page and Home feed).
 */
export const useFriendsGoingData = (eventIds: string[], enabled: boolean) => {
  const { user } = useAuth();

  const { data: followingIds = [] } = useQuery({
    queryKey: ["user-following-filter", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (error) throw error;
      return data.map((f) => f.following_id);
    },
    enabled: !!user?.id && enabled,
  });

  const idsKey = eventIds.join(",");

  const { data: guestlistByEvent } = useQuery({
    queryKey: ["guestlist-entries-filter", idsKey],
    queryFn: async () => {
      if (eventIds.length === 0) return new Map<string, string[]>();
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("event_id, user_id")
        .in("event_id", eventIds);
      if (error) throw error;

      const map = new Map<string, string[]>();
      data.forEach((entry) => {
        const existing = map.get(entry.event_id) || [];
        existing.push(entry.user_id);
        map.set(entry.event_id, existing);
      });
      return map;
    },
    enabled: enabled && eventIds.length > 0,
  });

  return useMemo(() => {
    if (!enabled || !guestlistByEvent) return null;
    return { followingIds, guestlistByEvent };
  }, [enabled, followingIds, guestlistByEvent]);
};
