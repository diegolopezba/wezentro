import { useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationContext } from "@/contexts/LocationContext";
import { useBlockedIds } from "./useBlockedUsers";
import { useHydrateLikeSummary } from "./useHydrateLikeSummary";
import {
  FOR_YOU_EVENTS_KEY,
  FOR_YOU_PAGE_SIZE,
  fetchForYouEventsPage,
  resetSessionSeed,
} from "@/lib/prefetchEvents";


/**
 * For You feed — server-assembled slate.
 *
 * The server (assemble-for-you-slate edge function) returns a fully-ranked,
 * deduped, ad-injected page. The client just appends pages in order. No
 * client-side scoring, no exploration shuffle, no reshuffling on context
 * updates — same architecture Instagram and Pinterest use.
 */
export const useForYouEvents = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { location } = useLocationContext();
  const userId = user?.id;
  const { data: blockedIds } = useBlockedIds();

  const {
    data: pageData,
    isLoading: queryLoading,
    error,
    refetch: rawRefetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...FOR_YOU_EVENTS_KEY, userId ?? "guest"],
    queryFn: ({ pageParam }) =>
      fetchForYouEventsPage(pageParam as string | null, FOR_YOU_PAGE_SIZE, {
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 2 * 60 * 1000,
    // Pinterest-style: feed is paginated and stable inside a session.
    // Don't refetch page 0 on focus/mount — it would discard loaded pages.
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Wait until auth has finished restoring the session.
    enabled: !authLoading,
  });

  const isLoading = authLoading || queryLoading;


  // Flatten pages and apply client-side block filter (server doesn't know
  // about blocks between the viewer and creators; cheap to filter here).
  const flat = (pageData?.pages || []).flatMap((p) => p.items);
  const filtered = blockedIds
    ? flat.filter((e: any) => !blockedIds.has(e.creator_id))
    : flat;

  // Batched like prefetch — one RPC per page, primes per-card caches.
  useHydrateLikeSummary(filtered.map((e: any) => e.id));


  // Pull-to-refresh: reset the session seed so the server starts a fresh
  // ordered slate (no carried-over seen-set).
  const refetch = useCallback(async () => {
    resetSessionSeed();
    return rawRefetch();
  }, [rawRefetch]);

  return {
    data: filtered,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
  };
};
