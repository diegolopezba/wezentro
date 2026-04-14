import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AttendeeInfo {
  user_id: string;
  username: string;
  avatar_url: string | null;
  isFollowed: boolean;
}

/**
 * Fetches all approved attendees for an event, with followed users sorted
 * by interaction score appearing first to create social proof / FOMO.
 */
export const useFollowingGoing = (eventId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["following-going", eventId, user?.id],
    queryFn: async (): Promise<AttendeeInfo[]> => {
      // 1. Get all approved attendees via public view (excludes qr_code_token)
      const { data: entries, error: entriesError } = await supabase
        .from("guestlist_entries_public")
        .select("user_id")
        .eq("event_id", eventId!)
        .eq("status", "approved");

      if (entriesError) {
        console.error("Error fetching attendees:", entriesError);
        return [];
      }

      if (!entries || entries.length === 0) return [];

      // Fetch profiles for attendees
      const userIds = entries.map((e: any) => e.user_id as string).filter(Boolean);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const allAttendees = userIds.map((uid) => {
        const profile = profileMap.get(uid);
        return {
          user_id: uid,
          username: (profile?.username || "user") as string,
          avatar_url: (profile?.avatar_url || null) as string | null,
          isFollowed: false,
        };
      });

      // If not authenticated, return all as non-followed
      if (!user?.id) return allAttendees;

      // 2. Get user's following list
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = new Set((following || []).map((f) => f.following_id));

      if (followingIds.size === 0) return allAttendees;

      // 3. Get interaction scores for followed users who are attending
      const attendeeFollowingIds = allAttendees
        .filter((a) => followingIds.has(a.user_id))
        .map((a) => a.user_id);

      let scoreMap: Record<string, number> = {};
      if (attendeeFollowingIds.length > 0) {
        const { data: prefs } = await supabase
          .from("user_creator_preferences")
          .select("creator_id, score")
          .eq("user_id", user.id)
          .in("creator_id", attendeeFollowingIds);

        scoreMap = Object.fromEntries(
          (prefs || []).map((p) => [p.creator_id, Number(p.score) || 0])
        );
      }

      // 4. Partition and sort: followed (by score desc) then others
      const followedGoing: AttendeeInfo[] = [];
      const othersGoing: AttendeeInfo[] = [];

      for (const attendee of allAttendees) {
        if (followingIds.has(attendee.user_id)) {
          followedGoing.push({ ...attendee, isFollowed: true });
        } else {
          othersGoing.push(attendee);
        }
      }

      followedGoing.sort(
        (a, b) => (scoreMap[b.user_id] || 0) - (scoreMap[a.user_id] || 0)
      );

      return [...followedGoing, ...othersGoing];
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};
