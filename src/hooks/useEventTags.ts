import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EventTag {
  id: string;
  event_id: string;
  tagged_user_id: string;
  tagged_by: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  tagged_user?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useEventTags = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-tags", eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID required");
      const { data, error } = await supabase
        .from("event_tags")
        .select("*, tagged_user:profiles!event_tags_tagged_user_id_fkey(id, username, full_name, avatar_url)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data as EventTag[];
    },
    enabled: !!eventId,
  });
};

export const useTagUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("event_tags")
        .insert({ event_id: eventId, tagged_user_id: userId, tagged_by: user.id });
      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-tags", eventId] });
    },
  });
};

export const useRespondToTag = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ tagId, status }: { tagId: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase
        .from("event_tags")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-tags"] });
      queryClient.invalidateQueries({ queryKey: ["pending-tags", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-timeline"] });
    },
  });
};

export const useRemoveTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("event_tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-tags"] });
      queryClient.invalidateQueries({ queryKey: ["user-timeline"] });
    },
  });
};

export const usePendingTags = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pending-tags", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("event_tags")
        .select("*, tagged_user:profiles!event_tags_tagged_user_id_fkey(id, username, full_name, avatar_url)")
        .eq("tagged_user_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
      return data as EventTag[];
    },
    enabled: !!user?.id,
  });
};
