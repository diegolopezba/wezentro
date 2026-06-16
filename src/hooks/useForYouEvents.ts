import { useMemo, useEffect, useState, useRef } from "react";
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
  hashSeed,
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

type FrozenItem = EventWithCreator & {
  guestlist_entries?: any[];
  _score: number;
  _isExploration?: boolean;
};

export const useForYouEvents = () => {
  const idleReady = useIdleReady();
  const { user } = useAuth();
  const { location } = useLocationContext();
  const userId = user?.id;

  const { data: blockedIds } = useBlockedIds();
  const { data: learnedPrefs } = useUserPreferences(userId);

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

  const { data: collaborativeBoosts } = useQuery({
    queryKey: ["collab-boosts-cached", userId],
    queryFn: async () => {
      if (!userId) return {} as Record<string, number>;
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

  /**
   * Session-stable seed for exploration shuffle. Same user + same mount =
   * same ordering across re-renders. Resets only on full remount or refetch.
   */
  const seedRef = useRef<number>(hashSeed(`${userId ?? "guest"}-${Date.now()}`));

  /**
   * Freeze-on-render order (Pinterest/Instagram pattern).
   *
   * `frozenItems` is the locked, append-only sequence shown to the user.
   * `processedPageCount` tracks how many pages from useInfiniteQuery we've
   * already scored & appended. New pages get scored once against the CURRENT
   * context snapshot and appended; previously-frozen items never reorder.
   *
   * This stops:
   *  - Late-resolving context queries from reshuffling on-screen cards.
   *  - New pages from pushing existing cards down.
   *  - Time-based scores from drifting and reordering items mid-scroll.
   */
  const [frozenItems, setFrozenItems] = useState<FrozenItem[]>([]);
  const processedPageCount = useRef(0);
  const seenIds = useRef<Set<string>>(new Set());

  // Reset frozen state when the query key data resets (refetch / pull-to-refresh).
  // useInfiniteQuery replaces `pages` on refetch — detect by checking if page 0's
  // first item changed identity while we had already processed pages.
  const firstItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    const firstPageFirstId = pageData?.pages?.[0]?.items?.[0]?.id ?? null;
    const prev = firstItemIdRef.current;
    if (
      processedPageCount.current > 0 &&
      firstPageFirstId &&
      prev &&
      firstPageFirstId !== prev &&
      // detect "fresh data" via cursor reset: page 0 is the entry point
      pageData?.pages?.length === 1
    ) {
      // Refetch happened — reset freeze.
      processedPageCount.current = 0;
      seenIds.current = new Set();
      seedRef.current = hashSeed(`${userId ?? "guest"}-${Date.now()}`);
      setFrozenItems([]);
    }
    if (firstPageFirstId) firstItemIdRef.current = firstPageFirstId;
  }, [pageData, userId]);

  useEffect(() => {
    if (!pageData?.pages) return;
    const totalPages = pageData.pages.length;
    if (totalPages <= processedPageCount.current) return;

    const now = new Date();
    const nowMs = now.getTime();
    const categoryPrefs = learnedPrefs?.categories || {};
    const creatorPrefs = learnedPrefs?.creators || {};
    const isNewUser =
      !userId ||
      (Object.keys(categoryPrefs).length === 0 &&
        Object.keys(creatorPrefs).length === 0);

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
      nowMs,
    };

    const newlyAdded: FrozenItem[] = [];
    for (let p = processedPageCount.current; p < totalPages; p++) {
      const page = pageData.pages[p];
      const raw = (page.items as unknown as (EventWithCreator & {
        guestlist_entries?: any[];
      })[]) || [];

      const filtered = raw.filter((e) => {
        if (seenIds.current.has(e.id)) return false;
        if (blockedIds && e.creator_id && blockedIds.has(e.creator_id)) return false;
        if (e.is_post) return true;
        if (!e.start_datetime) return true;
        return new Date(e.start_datetime) >= now;
      });

      const scored = filtered
        .map((event) => ({ ...event, _score: calculateEventScore(event, ctx) }))
        .sort((a, b) => b._score - a._score);

      // Seed varies per page so each page has its own deterministic shuffle.
      const pageSeed = seedRef.current ^ ((p + 1) * 0x9E3779B1);
      const withExploration = injectExploration(scored, categoryPrefs, pageSeed);

      for (const item of withExploration) {
        seenIds.current.add(item.id);
        newlyAdded.push(item as FrozenItem);
      }
    }

    processedPageCount.current = totalPages;
    if (newlyAdded.length > 0) {
      setFrozenItems((prev) => [...prev, ...newlyAdded]);
    }
    // We intentionally exclude context deps from the dep array — context is
    // snapshotted per page. Adding them would reshuffle the visible feed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData, blockedIds]);

  return {
    data: frozenItems,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
  };
};
