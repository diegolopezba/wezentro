import { useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedIds } from "./useBlockedUsers";
import {
  FOLLOWING_EVENTS_KEY,
  FOR_YOU_PAGE_SIZE,
  fetchFollowingEventsPage,
  resetSessionSeed,
} from "@/lib/prefetchEvents";
import { EventWithCreator } from "./useEvents";

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

/**
 * Following feed — server-assembled slate.
 * Server does ranking, dedupe, and repost merging. Client just renders.
 */
export const useFollowingEventsScored = () => {
  const { user } = useAuth();
  const { data: blockedIds } = useBlockedIds();

  const {
    data: pageData,
    isLoading,
    error,
    refetch: rawRefetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...FOLLOWING_EVENTS_KEY, user?.id ?? "guest"],
    queryFn: ({ pageParam }) =>
      fetchFollowingEventsPage(pageParam as string | null, FOR_YOU_PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const flat = (pageData?.pages || []).flatMap((p) =>
    p.items.map((it: any) => ({ ...it, repostInfo: it._repostInfo })),
  );
  const filtered = blockedIds
    ? flat.filter((e: any) => !blockedIds.has(e.creator_id))
    : flat;

  const refetch = useCallback(async () => {
    resetSessionSeed();
    return rawRefetch();
  }, [rawRefetch]);

  return {
    data: filtered as FeedEventWithRepost[],
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
  };
};
