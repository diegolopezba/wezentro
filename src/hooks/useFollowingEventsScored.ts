import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithCreator } from "./useEvents";

// Repost info type for feed items
export interface RepostInfo {
  repostedBy: { id: string; username: string; avatar_url: string | null }[];
  totalRepostsByFollowing: number;
  mostRecentRepostAt: string;
}

export interface FeedEventWithRepost extends EventWithCreator {
  guestlist_entries?: any[];
  repostInfo?: RepostInfo;
  _score?: number;
}

// Creator Relationship Score (35% weight - reduced from 40%)
// Base: 100 for direct follow, 120 for mutual follow
const getCreatorRelationshipScore = (
  creatorId: string,
  mutualFollowIds: string[],
  followingIds: string[]
): number => {
  // If not following the creator directly (only seeing via repost)
  if (!followingIds.includes(creatorId)) {
    return 0; // No creator relationship bonus for reposts from non-followed creators
  }
  // Check if mutual follow (they follow you back)
  if (mutualFollowIds.includes(creatorId)) {
    return 120; // Mutual follow bonus
  }
  // Base score for direct follow
  return 100;
};

// Post Recency Score (25% weight - reduced from 30%)
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
const getEventTimingScore = (startDatetime: string | null): number => {
  if (!startDatetime) return 50; // Neutral score for posts
  
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

// Repost Score (20% weight) - NEW
// Boost for events reposted by followed users
const getRepostScore = (
  repostCount: number,
  mutualRepostCount: number
): number => {
  if (repostCount === 0) return 0;
  
  // Base score based on number of followed users who reposted
  let baseScore = 0;
  if (repostCount >= 3) baseScore = 100;
  else if (repostCount === 2) baseScore = 80;
  else baseScore = 50;
  
  // Bonus for mutual followers who reposted (+20 each, max +40)
  const mutualBonus = Math.min(mutualRepostCount * 20, 40);
  
  return Math.min(baseScore + mutualBonus, 120);
};

// Calculate final score with weighted components
const calculateFollowingEventScore = (
  event: FeedEventWithRepost,
  mutualFollowIds: string[],
  followingIds: string[]
): number => {
  const creatorRelationshipScore = getCreatorRelationshipScore(
    event.creator_id,
    mutualFollowIds,
    followingIds
  );
  const postRecencyScore = getPostRecencyScore(event.created_at);
  const eventTimingScore = getEventTimingScore(event.start_datetime);
  
  // Calculate repost score
  const repostCount = event.repostInfo?.totalRepostsByFollowing || 0;
  const mutualRepostCount = event.repostInfo?.repostedBy.filter(
    (r) => mutualFollowIds.includes(r.id)
  ).length || 0;
  const repostScore = getRepostScore(repostCount, mutualRepostCount);

  // Weighted formula (90% total - 10% reserved for future social engagement)
  return (
    creatorRelationshipScore * 0.35 +  // 35% - creator relationship
    postRecencyScore * 0.25 +           // 25% - post recency
    eventTimingScore * 0.10 +           // 10% - event timing
    repostScore * 0.20                  // 20% - repost boost
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

  // Fetch reposts from followed users
  const { data: reposts } = useQuery({
    queryKey: ["following-reposts", followingIds],
    queryFn: async () => {
      if (!followingIds || followingIds.length === 0) return [];

      const { data, error } = await supabase
        .from("reposts")
        .select(`
          id,
          event_id,
          created_at,
          user_id,
          user:profiles!reposts_user_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .in("user_id", followingIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!followingIds && followingIds.length > 0,
  });

  // Fetch events from followed users (including posts without dates)
  const {
    data: directEvents,
    isLoading: directLoading,
    error: directError,
    refetch: refetchDirect,
  } = useQuery({
    queryKey: ["following-events-direct", followingIds],
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (EventWithCreator & { guestlist_entries?: any[] })[];
    },
    enabled: !!followingIds && followingIds.length > 0,
  });

  // Fetch reposted events (may include events from non-followed creators)
  const repostedEventIds = useMemo(() => {
    if (!reposts) return [];
    return [...new Set(reposts.map((r) => r.event_id))];
  }, [reposts]);

  const { data: repostedEvents } = useQuery({
    queryKey: ["reposted-events", repostedEventIds],
    queryFn: async () => {
      if (repostedEventIds.length === 0) return [];

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
        .in("id", repostedEventIds)
        .eq("is_public", true)
        .is("deleted_at", null);

      if (error) throw error;
      return data as (EventWithCreator & { guestlist_entries?: any[] })[];
    },
    enabled: repostedEventIds.length > 0,
  });

  // Merge and score events
  const scoredEvents = useMemo(() => {
    const eventMap = new Map<string, FeedEventWithRepost>();
    const now = new Date();

    // Add direct events from followed users
    directEvents?.forEach((event) => {
      // Filter: include posts (no start_datetime) OR future events
      if (event.start_datetime && new Date(event.start_datetime) < now) return;
      
      eventMap.set(event.id, { ...event });
    });

    // Add reposted events and build repost info
    if (reposts && repostedEvents) {
      // Group reposts by event_id
      const repostsByEvent = new Map<string, typeof reposts>();
      reposts.forEach((repost) => {
        const existing = repostsByEvent.get(repost.event_id) || [];
        existing.push(repost);
        repostsByEvent.set(repost.event_id, existing);
      });

      repostedEvents.forEach((event) => {
        // Filter: include posts (no start_datetime) OR future events
        if (event.start_datetime && new Date(event.start_datetime) < now) return;

        const eventReposts = repostsByEvent.get(event.id) || [];
        const repostInfo: RepostInfo = {
          repostedBy: eventReposts
            .map((r) => r.user)
            .filter(Boolean) as RepostInfo["repostedBy"],
          totalRepostsByFollowing: eventReposts.length,
          mostRecentRepostAt: eventReposts[0]?.created_at || "",
        };

        const existing = eventMap.get(event.id);
        if (existing) {
          // Merge repost info with existing event
          existing.repostInfo = repostInfo;
        } else {
          // Add new event from repost (creator not followed directly)
          eventMap.set(event.id, { ...event, repostInfo });
        }
      });
    }

    // Score and sort
    return Array.from(eventMap.values())
      .map((event) => ({
        ...event,
        _score: calculateFollowingEventScore(event, mutualFollowIds, followingIds || []),
      }))
      .sort((a, b) => b._score - a._score);
  }, [directEvents, reposts, repostedEvents, mutualFollowIds, followingIds]);

  return {
    data: scoredEvents,
    isLoading: directLoading || !followingIds,
    error: directError,
    refetch: refetchDirect,
  };
};
