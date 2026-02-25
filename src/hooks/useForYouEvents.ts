import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationContext } from "@/contexts/LocationContext";
import { useUserPreferences } from "./useUserPreferences";
import { EventWithCreator } from "./useEvents";
import {
  calculateEventScore,
  injectExploration,
  ScoringContext,
} from "@/lib/feedScoring";

export const useForYouEvents = () => {
  const { user } = useAuth();
  const { location } = useLocationContext();
  const userId = user?.id;

  const { data: learnedPrefs } = useUserPreferences(userId);

  const { data: userProfile } = useQuery({
    queryKey: ["user-interests", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: following } = useQuery({
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

  const { data: trendingData } = useQuery({
    queryKey: ["trending-counts"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("event_interactions")
        .select("event_id")
        .gte("created_at", twentyFourHoursAgo)
        .limit(500);
      if (error) return {};
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.event_id] = (counts[row.event_id] || 0) + 1;
      }
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: creatorAttendance } = useQuery({
    queryKey: ["creator-attendance", userId],
    queryFn: async () => {
      if (!userId) return {};
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("event_id, events!guestlist_entries_event_id_fkey(creator_id)")
        .eq("user_id", userId)
        .eq("status", "approved");
      if (error) return {};
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        const creatorId = (row as any).events?.creator_id;
        if (creatorId) counts[creatorId] = (counts[creatorId] || 0) + 1;
      }
      return counts;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: dayOfWeekPrefs } = useQuery({
    queryKey: ["day-of-week-prefs", userId],
    queryFn: async () => {
      if (!userId) return {};
      const today = new Date().getDay();
      const { data, error } = await supabase
        .from("user_day_preferences")
        .select("category, score")
        .eq("user_id", userId)
        .eq("day_of_week", today);
      if (error) return {};
      const prefs: Record<string, number> = {};
      for (const row of data || []) prefs[row.category] = Number(row.score) || 0;
      return prefs;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: tagPrefs } = useQuery({
    queryKey: ["user-tag-prefs", userId],
    queryFn: async () => {
      if (!userId) return {};
      const { data, error } = await supabase
        .from("user_tag_preferences")
        .select("tag, score")
        .eq("user_id", userId);
      if (error) return {};
      const prefs: Record<string, number> = {};
      for (const row of data || []) prefs[row.tag] = Number(row.score) || 0;
      return prefs;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  // v5: Mutual followers
  const { data: mutualFollowerIds } = useQuery({
    queryKey: ["mutual-followers-ids", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("get_mutual_followers", { _user_id: userId });
      if (error) return [];
      return (data || []).map((u: any) => u.id as string);
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  // v5: Collaborative filtering — find similar users' engaged events
  const { data: collaborativeBoosts } = useQuery({
    queryKey: ["collaborative-boosts", userId],
    queryFn: async () => {
      if (!userId) return {};

      // 1. Get current user's category preferences
      const { data: myPrefs, error: myError } = await supabase
        .from("user_category_preferences")
        .select("category, score")
        .eq("user_id", userId);
      if (myError || !myPrefs?.length) return {};

      const myCategories = myPrefs.map((p) => p.category);

      // 2. Find users who share at least one top category (limited to recent active users)
      const { data: similarUserPrefs, error: simError } = await supabase
        .from("user_category_preferences")
        .select("user_id, category, score")
        .in("category", myCategories)
        .neq("user_id", userId)
        .gte("score", 20)
        .order("score", { ascending: false })
        .limit(100);

      if (simError || !similarUserPrefs?.length) return {};

      // Score similarity per user
      const myScoreMap: Record<string, number> = {};
      for (const p of myPrefs) myScoreMap[p.category] = Number(p.score) || 0;

      const userScores: Record<string, number> = {};
      for (const row of similarUserPrefs) {
        const overlap = myScoreMap[row.category];
        if (overlap) {
          const similarity = Math.min(overlap, Number(row.score) || 0);
          userScores[row.user_id] = (userScores[row.user_id] || 0) + similarity;
        }
      }

      // Top 5 similar users
      const topUsers = Object.entries(userScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid]) => uid);

      if (!topUsers.length) return {};

      // 3. Get events these users recently interacted with (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: interactions, error: intError } = await supabase
        .from("event_interactions")
        .select("event_id, user_id")
        .in("user_id", topUsers)
        .in("type", ["join", "save", "like", "click"])
        .gte("created_at", sevenDaysAgo);

      if (intError || !interactions?.length) return {};

      const boosts: Record<string, number> = {};
      for (const row of interactions) {
        boosts[row.event_id] = (boosts[row.event_id] || 0) + 1;
      }
      // Normalize: count unique users per event
      const eventUsers: Record<string, Set<string>> = {};
      for (const row of interactions) {
        if (!eventUsers[row.event_id]) eventUsers[row.event_id] = new Set();
        eventUsers[row.event_id].add(row.user_id!);
      }
      const result: Record<string, number> = {};
      for (const [eid, users] of Object.entries(eventUsers)) {
        result[eid] = users.size;
      }
      return result;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch public events (capped at 200 for performance)
  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["for-you-events"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          creator:profiles!events_creator_id_fkey(
            id, username, full_name, avatar_url
          ),
          guestlist_entries(
            user:profiles!guestlist_entries_user_id_fkey(
              id, avatar_url
            )
          )
        `
        )
        .eq("is_public", true)
        .is("deleted_at", null)
        // Include posts (no start_datetime) OR future events
        .or(`is_post.eq.true,start_datetime.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as (EventWithCreator & { guestlist_entries?: any[] })[];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Score, sort, and inject exploration
  const scoredEvents = useMemo(() => {
    if (!events) return [];

    const now = new Date();
    const categoryPrefs = learnedPrefs?.categories || {};
    const creatorPrefs = learnedPrefs?.creators || {};

    const ctx: ScoringContext = {
      userLat: location?.lat || null,
      userLon: location?.lng || null,
      userInterests: userProfile?.interests || null,
      followingIds: following || null,
      categoryPrefs,
      creatorPrefs,
      trendingCounts: trendingData || {},
      creatorAttendance: creatorAttendance || {},
      dayOfWeekPrefs: dayOfWeekPrefs || {},
      tagPrefs: tagPrefs || {},
      collaborativeBoosts: collaborativeBoosts || {},
      mutualFollowerIds: mutualFollowerIds || null,
    };

    const filtered = events.filter((e) => {
      if (!e.start_datetime) return true;
      return new Date(e.start_datetime) >= now;
    });

    const scored = filtered
      .map((event) => ({
        ...event,
        _score: calculateEventScore(event, ctx),
      }))
      .sort((a, b) => b._score - a._score);

    return injectExploration(scored, categoryPrefs);
  }, [events, location, userProfile?.interests, following, learnedPrefs, trendingData, creatorAttendance, dayOfWeekPrefs, tagPrefs, collaborativeBoosts, mutualFollowerIds]);

  return {
    data: scoredEvents,
    isLoading,
    error,
    refetch,
  };
};
