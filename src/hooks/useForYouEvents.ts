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

  /**
   * V7: Consolidated per-user context in ONE round-trip.
   * Replaces 6 separate queries (interests, following, creator-attendance,
   * day-of-week prefs, tag prefs, mutual followers) with a single RPC.
   * Critical for scaling — one DB hit per session instead of six.
   */
  const { data: forYouContext } = useQuery({
    queryKey: ["for-you-context", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_for_you_context", {
        _user_id: userId ?? null,
      });
      if (error) throw error;
      return (data ?? {}) as any;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const userProfile = useMemo(
    () => (forYouContext?.interests ? { interests: forYouContext.interests as string[] } : null),
    [forYouContext],
  );
  const following = useMemo<string[]>(
    () => (forYouContext?.following_ids as string[]) || [],
    [forYouContext],
  );
  const creatorAttendance = useMemo<Record<string, number>>(
    () => (forYouContext?.creator_attendance as Record<string, number>) || {},
    [forYouContext],
  );
  const dayOfWeekPrefs = useMemo<Record<string, number>>(
    () => (forYouContext?.day_of_week_prefs as Record<string, number>) || {},
    [forYouContext],
  );
  const tagPrefs = useMemo<Record<string, number>>(
    () => (forYouContext?.tag_prefs as Record<string, number>) || {},
    [forYouContext],
  );
  const mutualFollowerIds = useMemo<string[]>(
    () => (forYouContext?.mutual_follower_ids as string[]) || [],
    [forYouContext],
  );

  /**
   * V7: Trending now reads from a precomputed cache, refreshed every 2 minutes
   * by pg_cron. Constant-time read regardless of interaction volume.
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

  /**
   * V7: Collaborative boosts read from a per-user precomputed cache.
   * Refreshed lazily (>6h old) via ensure_collab_boosts_fresh, deferred
   * until idle so it never gates first paint.
   */
  const { data: collaborativeBoosts } = useQuery({
    queryKey: ["collab-boosts-cached", userId],
    queryFn: async () => {
      if (!userId) return {} as Record<string, number>;
      // Fire-and-forget freshness check; cached read returns immediately.
      supabase.rpc("ensure_collab_boosts_fresh", { _user_id: userId }).then(() => {});
      const { data, error } = await supabase.rpc("get_collab_boosts", { _user_id: userId });
      if (error) return {} as Record<string, number>;
      const map: Record<string, number> = {};
      for (const row of data || []) map[row.event_id] = Number(row.boost_count) || 0;
      return map;
    },
    enabled: !!userId && idleReady,
    staleTime: 30 * 60 * 1000,
  });

  const {
    data: pageData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: FOR_YOU_EVENTS_KEY,
    queryFn: ({ pageParam }) =>
      fetchForYouEventsPage(pageParam as string | null, FOR_YOU_PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 2 * 60 * 1000,
  });

  // Flatten cursor pages into a single events array.
  const events = useMemo(() => {
    if (!pageData) return [] as (EventWithCreator & { guestlist_entries?: any[] })[];
    return pageData.pages.flatMap(
      (p) => p.items as unknown as (EventWithCreator & { guestlist_entries?: any[] })[],
    );
  }, [pageData]);

  const scoredEvents = useMemo(() => {
    if (!events.length) return [];

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
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
  };
};
