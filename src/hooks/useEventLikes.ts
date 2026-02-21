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
    // Enable for guests too - will return false
    enabled: !!eventId,
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
    onSuccess: (_, eventId) => {
      haptic("medium");
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
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["event-liked", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-likes", eventId] });
    },
  });
}
