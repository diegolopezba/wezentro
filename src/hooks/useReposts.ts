import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trackPreferenceSignal } from "@/lib/preferenceTracking";
import { haptic } from "@/lib/haptics";

export const useHasReposted = (eventId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["has-reposted", eventId, user?.id],
    queryFn: async () => {
      // Return false for guests - safe default
      if (!user?.id || !eventId) return false;

      const { data, error } = await supabase
        .from("reposts")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    // Enable for guests too - will return false
    enabled: !!eventId,
  });
};

export const useRepostCount = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["repost-count", eventId],
    queryFn: async () => {
      if (!eventId) return 0;

      const { count, error } = await supabase
        .from("reposts")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId,
  });
};

export const useToggleRepost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      isReposted,
    }: {
      eventId: string;
      isReposted: boolean;
    }) => {
      if (!user?.id) throw new Error("Must be logged in to repost");

      if (isReposted) {
        // Remove repost
        const { error } = await supabase
          .from("reposts")
          .delete()
          .eq("user_id", user.id)
          .eq("event_id", eventId);

        if (error) throw error;
      } else {
        // Add repost
        const { error } = await supabase.from("reposts").insert({
          user_id: user.id,
          event_id: eventId,
        });

        if (error) throw error;

        // Track preference signal for new reposts (fire-and-forget)
        trackPreferenceSignal(user.id, eventId, "repost");
      }
    },
    onSuccess: (_, { eventId, isReposted }) => {
      if (!isReposted) haptic("medium");
      queryClient.invalidateQueries({ queryKey: ["has-reposted", eventId] });
      queryClient.invalidateQueries({ queryKey: ["repost-count", eventId] });
      queryClient.invalidateQueries({ queryKey: ["following-events-scored"] });
      
      toast.success(isReposted ? "Repost eliminado" : "Reposteado");
    },
    onError: (error) => {
      console.error("Repost error:", error);
      toast.error("Error al repostear");
    },
  });
};

// Get reposts made by users the current user follows (for feed)
export const useFollowingReposts = (followingIds: string[] | undefined) => {
  return useQuery({
    queryKey: ["following-reposts", followingIds],
    queryFn: async () => {
      if (!followingIds || followingIds.length === 0) return [];

      const { data, error } = await supabase
        .from("reposts")
        .select(`
          id,
          event_id,
          created_at,
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
};
