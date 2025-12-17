import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useIsOnGuestlist = (eventId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["guestlist-status", eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user) return null;

      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!user,
  });
};

export const useJoinGuestlist = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in");

      // Insert guestlist entry
      const { data: entry, error: entryError } = await supabase
        .from("guestlist_entries")
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Find the event's group chat and add user as participant
      const { data: chat } = await supabase
        .from("chats")
        .select("id")
        .eq("event_id", eventId)
        .eq("type", "event")
        .maybeSingle();

      if (chat) {
        await supabase.from("chat_participants").insert({
          chat_id: chat.id,
          user_id: user.id,
        });
      }

      return entry;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["guestlist-status", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-guestlist", eventId] });
      queryClient.invalidateQueries({ queryKey: ["user-chats"] });
    },
  });
};

export const useLeaveGuestlist = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in");

      // Remove from guestlist
      const { error } = await supabase
        .from("guestlist_entries")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Find the event's group chat and remove user as participant
      const { data: chat } = await supabase
        .from("chats")
        .select("id")
        .eq("event_id", eventId)
        .eq("type", "event")
        .maybeSingle();

      if (chat) {
        await supabase
          .from("chat_participants")
          .delete()
          .eq("chat_id", chat.id)
          .eq("user_id", user.id);
      }
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["guestlist-status", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-guestlist", eventId] });
      queryClient.invalidateQueries({ queryKey: ["user-chats"] });
    },
  });
};

export const useHasActiveSubscription = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription-status", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase.rpc("has_active_subscription", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user,
  });
};

export const usePendingGuestlistRequests = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["pending-guestlist", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from("guestlist_entries")
        .select(`
          id,
          user_id,
          status,
          joined_at,
          user:profiles!guestlist_entries_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("event_id", eventId)
        .eq("status", "pending")
        .order("joined_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });
};

export const useApproveGuestlistEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, eventId }: { entryId: string; eventId: string }) => {
      const { error } = await supabase
        .from("guestlist_entries")
        .update({ status: "approved" })
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-guestlist", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-guestlist", eventId] });
    },
  });
};

export const useRejectGuestlistEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, eventId, userId }: { entryId: string; eventId: string; userId: string }) => {
      // First remove from chat participants if they were added
      const { data: chat } = await supabase
        .from("chats")
        .select("id")
        .eq("event_id", eventId)
        .eq("type", "event")
        .maybeSingle();

      if (chat) {
        await supabase
          .from("chat_participants")
          .delete()
          .eq("chat_id", chat.id)
          .eq("user_id", userId);
      }

      // Update status to rejected
      const { error } = await supabase
        .from("guestlist_entries")
        .update({ status: "rejected" })
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-guestlist", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-guestlist", eventId] });
    },
  });
};
