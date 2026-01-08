import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithCreator } from "./useEvents";

// Creator Relationship Score (40% weight)
// Base: 100 for direct follow, 120 for mutual follow
const getCreatorRelationshipScore = (
  creatorId: string,
  mutualFollowIds: string[]
): number => {
  // Check if mutual follow (they follow you back)
  if (mutualFollowIds.includes(creatorId)) {
    return 120; // Mutual follow bonus
  }
  // Base score for direct follow (they're in following list by default)
  return 100;
};

// Post Recency Score (30% weight)
// Prioritizes recently posted events
const getPostRecencyScore = (createdAt: string): number => {
  const now = new Date();
  const created = new Date(createdAt);
  const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (hoursAgo <= 24) return 100;      // < 24 hours ago
  if (hoursAgo <= 72) return 80;       // 1-3 days ago
  if (hoursAgo <= 168) return 60;      // 3-7 days ago
  if (hoursAgo <= 336) return 40;      // 1-2 weeks ago
  return 20;                            // 2+ weeks ago
};

// Event Timing Score (10% weight)
// Slight boost for events happening soon
const getEventTimingScore = (startDatetime: string): number => {
  const now = new Date();
  const start = new Date(startDatetime);
  const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 0) return 0;        // Past events
  if (hoursUntil <= 24) return 100;    // Today
  if (hoursUntil <= 48) return 90;     // Tomorrow
  if (hoursUntil <= 168) return 70;    // 2-7 days
  if (hoursUntil <= 672) return 50;    // 1-4 weeks
  return 30;                            // 1+ months
};

// Calculate final score with weighted components
// Note: Social Engagement Score (20%) will be added later
const calculateFollowingEventScore = (
  event: EventWithCreator,
  mutualFollowIds: string[]
): number => {
  const creatorRelationshipScore = getCreatorRelationshipScore(
    event.creator_id,
    mutualFollowIds
  );
  const postRecencyScore = getPostRecencyScore(event.created_at);
  const eventTimingScore = getEventTimingScore(event.start_datetime);

  // Weighted formula (80% total - social engagement to be added later)
  return (
    creatorRelationshipScore * 0.40 +  // 40% - creator relationship
    postRecencyScore * 0.30 +           // 30% - post recency
    eventTimingScore * 0.10             // 10% - event timing
  );
};

export const useFollowingEventsScored = () => {
  const { user } = useAuth();

  // Fetch list of users the current user follows
  const { data: followingIds } = useQuery({
    queryKey: ["user-following-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (error) throw error;
      return data.map((f) => f.following_id);
    },
    enabled: !!user?.id,
  });

  // Fetch list of users who follow the current user (for mutual follow detection)
  const { data: followerIds } = useQuery({
    queryKey: ["user-follower-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      if (error) throw error;
      return data.map((f) => f.follower_id);
    },
    enabled: !!user?.id,
  });

  // Calculate mutual follows (people you follow who also follow you back)
  const mutualFollowIds = useMemo(() => {
    if (!followingIds || !followerIds) return [];
    return followingIds.filter((id) => followerIds.includes(id));
  }, [followingIds, followerIds]);

  // Fetch events from followed users
  const {
    data: events,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["following-events-scored", followingIds],
    queryFn: async () => {
      if (!followingIds || followingIds.length === 0) return [];

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
          guestlist_entries(
            user:profiles!guestlist_entries_user_id_fkey(
              id,
              avatar_url
            )
          )
        `)
        .in("creator_id", followingIds)
        .eq("is_public", true)
        .is("deleted_at", null)
        .gte("start_datetime", new Date().toISOString())
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      return data as (EventWithCreator & { guestlist_entries?: any[] })[];
    },
    enabled: !!followingIds && followingIds.length > 0,
  });

  // Score and sort events
  const scoredEvents = useMemo(() => {
    if (!events) return [];

    return events
      .map((event) => ({
        ...event,
        _score: calculateFollowingEventScore(event, mutualFollowIds),
      }))
      .sort((a, b) => b._score - a._score);
  }, [events, mutualFollowIds]);

  return {
    data: scoredEvents,
    isLoading: isLoading || !followingIds,
    error,
  };
};
