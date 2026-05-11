import { useMemo, useEffect, useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationContext } from "@/contexts/LocationContext";
import { useUserPreferences } from "./useUserPreferences";
import { useBlockedIds } from "./useBlockedUsers";
import type { EventWithCreator } from "./useEvents";
import {
  calculateEventScore,
  injectExploration,
  ScoringContext,
} from "@/lib/feedScoring";
import {
  FOR_YOU_EVENTS_KEY,
  FOR_YOU_PAGE_SIZE,
  fetchForYouEventsPage,
} from "@/lib/prefetchEvents";

/**
 * Mobile-first deferral: secondary ranking signals (creator-attendance,
 * day-of-week prefs, tag prefs, mutual followers, collaborative boosts)
 * don't gate first paint. They re-rank the feed in place once idle —
 * same pattern as Pinterest's "rerank on settle".
 */
const useIdleReady = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fire = () => { if (!cancelled) setReady(true); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (typeof w.requestIdleCallback === "function") {
      const handle = w.requestIdleCallback(fire, { timeout: 2000 });
      return () => { cancelled = true; w.cancelIdleCallback?.(handle); };
    }
    const t = setTimeout(fire, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);
  return ready;
};

export const useForYouEvents = () => {
  const idleReady = useIdleReady();
  const { user } = useAuth();
  const { location } = useLocationContext();
  const userId = user?.id;

  const { data: blockedIds } = useBlockedIds();
  const { data: learnedPrefs } = useUserPreferences(userId);

  const { data: userProfile } = useQuery({
    queryKey: ["user-interests", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("interests, birth_date, gender")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
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

  /**
   * V6: Server-side trending + velocity aggregation via RPC.
   * Single query replaces two client-side queries, no 1000-row limit.
   */
  const { data: trendingVelocityData } = useQuery({
    queryKey: ["trending-velocity-rpc"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trending_scores");
      if (error) return { trending: {}, velocity: {} };
      const trending: Record<string, number> = {};
      const velocity: Record<string, number> = {};
      for (const row of data || []) {
        trending[row.event_id] = Number(row.trending_score) || 0;
        velocity[row.event_id] = Number(row.velocity_count) || 0;
      }
      return { trending, velocity };
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
    enabled: !!userId && idleReady,
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
    enabled: !!userId && idleReady,
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
    enabled: !!userId && idleReady,
    staleTime: 10 * 60 * 1000,
  });

  const { data: mutualFollowerIds } = useQuery({
    queryKey: ["mutual-followers-ids", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("get_mutual_followers", { _user_id: userId });
      if (error) return [];
      return (data || []).map((u: any) => u.id as string);
    },
    enabled: !!userId && idleReady,
    staleTime: 10 * 60 * 1000,
  });

  const { data: collaborativeBoosts } = useQuery({
    queryKey: ["collaborative-boosts", userId],
    queryFn: async () => {
      if (!userId) return {};

      const { data: myPrefs, error: myError } = await supabase
        .from("user_category_preferences")
        .select("category, score")
        .eq("user_id", userId);
      if (myError || !myPrefs?.length) return {};

      const myCategories = myPrefs.map((p) => p.category);

      const { data: similarUserPrefs, error: simError } = await supabase
        .from("user_category_preferences")
        .select("user_id, category, score")
        .in("category", myCategories)
        .neq("user_id", userId)
        .gte("score", 20)
        .order("score", { ascending: false })
        .limit(100);

      if (simError || !similarUserPrefs?.length) return {};

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

      const topUsers = Object.entries(userScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid]) => uid);

      if (!topUsers.length) return {};

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: interactions, error: intError } = await supabase
        .from("event_interactions")
        .select("event_id, user_id")
        .in("user_id", topUsers)
        .in("type", ["join", "save", "like", "click"])
        .gte("created_at", sevenDaysAgo);

      if (intError || !interactions?.length) return {};

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
    enabled: !!userId && idleReady,
    staleTime: 30 * 60 * 1000,
  });

  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: FOR_YOU_EVENTS_KEY,
    queryFn: () => fetchForYouEvents() as Promise<(EventWithCreator & { guestlist_entries?: any[] })[]>,
    staleTime: 2 * 60 * 1000,
  });

  const scoredEvents = useMemo(() => {
    if (!events) return [];

    const now = new Date();
    const categoryPrefs = learnedPrefs?.categories || {};
    const creatorPrefs = learnedPrefs?.creators || {};

    const isNewUser = !userId ||
      (Object.keys(categoryPrefs).length === 0 && Object.keys(creatorPrefs).length === 0);

    const ctx: ScoringContext = {
      userLat: location?.lat || null,
      userLon: location?.lng || null,
      userInterests: userProfile?.interests || null,
      followingIds: following || null,
      categoryPrefs,
      creatorPrefs,
      trendingCounts: trendingVelocityData?.trending || {},
      creatorAttendance: creatorAttendance || {},
      dayOfWeekPrefs: dayOfWeekPrefs || {},
      tagPrefs: tagPrefs || {},
      collaborativeBoosts: collaborativeBoosts || {},
      mutualFollowerIds: mutualFollowerIds || null,
      velocityCounts: trendingVelocityData?.velocity || {},
      isNewUser,
    };

    const filtered = events.filter((e) => {
      // Hide content from blocked users (and users who blocked current user)
      if (blockedIds && e.creator_id && blockedIds.has(e.creator_id)) return false;
      if (e.is_post) return true;
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
  }, [events, location, userProfile?.interests, following, learnedPrefs, trendingVelocityData, creatorAttendance, dayOfWeekPrefs, tagPrefs, collaborativeBoosts, mutualFollowerIds, userId, blockedIds]);

  return {
    data: scoredEvents,
    isLoading,
    error,
    refetch,
  };
};
