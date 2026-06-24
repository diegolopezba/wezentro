import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { haptic } from "@/lib/haptics";

export function useEventLikes(eventId: string) {
  return useQuery({
    queryKey: ["event-likes", eventId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_likes")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId,
    // Big-tech pattern: feeds prime this cache via useHydrateLikeSummary.
    // Stay fresh for 1 min and never refetch on mount/focus so primed data
    // is reused across page transitions.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useIsEventLiked(eventId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["event-liked", eventId, user?.id],
    queryFn: async () => {
      // Return false for guests - safe default
      if (!user) return false;

      const { data, error } = await supabase
        .from("event_likes")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!eventId,
    // Feeds prime this cache via useHydrateLikeSummary — avoid per-card refetches.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}


export function useLikeEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in to like events");

      const { error } = await supabase
        .from("event_likes")
        .insert({ event_id: eventId, user_id: user.id });

      if (error) throw error;

      // Track preference signal (fire-and-forget)
      trackPreferenceSignal(user.id, eventId, "like");
    },
    onMutate: async (eventId: string) => {
      await queryClient.cancelQueries({ queryKey: ["event-liked", eventId] });
      await queryClient.cancelQueries({ queryKey: ["event-likes", eventId] });
      const prevLiked = queryClient.getQueryData(["event-liked", eventId, user?.id]);
      const prevCount = queryClient.getQueryData<number>(["event-likes", eventId]);
      queryClient.setQueryData(["event-liked", eventId, user?.id], true);
      queryClient.setQueryData(["event-likes", eventId], (old: number = 0) => old + 1);
      haptic("medium");
      return { prevLiked, prevCount };
    },
    onError: (_, eventId, context) => {
      queryClient.setQueryData(["event-liked", eventId, user?.id], context?.prevLiked);
      queryClient.setQueryData(["event-likes", eventId], context?.prevCount);
    },
    onSettled: (_, __, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["event-liked", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-likes", eventId] });
    },
  });
}

export function useUnlikeEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in to unlike events");

      const { error } = await supabase
        .from("event_likes")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onMutate: async (eventId: string) => {
      await queryClient.cancelQueries({ queryKey: ["event-liked", eventId] });
      await queryClient.cancelQueries({ queryKey: ["event-likes", eventId] });
      const prevLiked = queryClient.getQueryData(["event-liked", eventId, user?.id]);
      const prevCount = queryClient.getQueryData<number>(["event-likes", eventId]);
      queryClient.setQueryData(["event-liked", eventId, user?.id], false);
      queryClient.setQueryData(["event-likes", eventId], (old: number = 0) => Math.max(0, old - 1));
      return { prevLiked, prevCount };
    },
    onError: (_, eventId, context) => {
      queryClient.setQueryData(["event-liked", eventId, user?.id], context?.prevLiked);
      queryClient.setQueryData(["event-likes", eventId], context?.prevCount);
    },
    onSettled: (_, __, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["event-liked", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-likes", eventId] });
    },
  });
}
