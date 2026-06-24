/**
 * Batched like-summary prefetcher.
 *
 * Big-tech pattern (TAO / Pinterest): instead of one "is this liked?" + one
 * "how many likes?" query per card, fire a single RPC with all visible event
 * ids and hydrate the React Query cache so per-card hooks resolve instantly
 * without firing their own network requests.
 */
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LikeSummaryRow {
  event_id: string;
  like_count: number;
  viewer_liked: boolean;
}

export function useHydrateLikeSummary(eventIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Stable key: sorted, deduped, joined
  const key = useMemo(() => {
    const set = Array.from(new Set(eventIds.filter(Boolean))).sort();
    return set;
  }, [eventIds]);

  const query = useQuery({
    queryKey: ["event-like-summary", user?.id ?? "guest", key.join(",")],
    queryFn: async (): Promise<LikeSummaryRow[]> => {
      if (key.length === 0) return [];
      const { data, error } = await supabase.rpc("get_event_like_summary", {
        _event_ids: key,
      });
      if (error) throw error;
      return (data ?? []) as LikeSummaryRow[];
    },
    enabled: key.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Prime per-event caches so card-level hooks return cached values
  // and skip their own network calls.
  useEffect(() => {
    if (!query.data) return;
    for (const row of query.data) {
      queryClient.setQueryData(["event-likes", row.event_id], row.like_count);
      queryClient.setQueryData(
        ["event-liked", row.event_id, user?.id],
        row.viewer_liked,
      );
    }
  }, [query.data, queryClient, user?.id]);
}
