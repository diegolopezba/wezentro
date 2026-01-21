import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSaveCount(eventId: string | undefined) {
  return useQuery({
    queryKey: ["save-count", eventId],
    queryFn: async () => {
      if (!eventId) return 0;

      const { count, error } = await supabase
        .from("saved_events")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId,
  });
}

export function useSavedEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_events")
        .select(`
          id,
          created_at,
          event:events (
            id,
            title,
            image_url,
            start_datetime,
            location_name,
            category,
            creator_id,
            deleted_at,
            creator:profiles!events_creator_id_fkey (
              id,
              username,
              avatar_url
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter out deleted events
      return data?.filter(item => item.event && !item.event.deleted_at) || [];
    },
    enabled: !!user,
  });
}

export function useIsEventSaved(eventId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-event-saved", eventId, user?.id],
    queryFn: async () => {
      if (!user || !eventId) return false;

      const { data, error } = await supabase
        .from("saved_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!eventId,
  });
}

export function useSaveEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in to save events");

      const { data, error } = await supabase
        .from("saved_events")
        .insert({
          user_id: user.id,
          event_id: eventId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["saved-events"] });
      queryClient.invalidateQueries({ queryKey: ["is-event-saved", eventId] });
      queryClient.invalidateQueries({ queryKey: ["save-count", eventId] });
    },
  });
}

export function useUnsaveEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in to unsave events");

      const { error } = await supabase
        .from("saved_events")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId);

      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["saved-events"] });
      queryClient.invalidateQueries({ queryKey: ["is-event-saved", eventId] });
      queryClient.invalidateQueries({ queryKey: ["save-count", eventId] });
    },
  });
}
