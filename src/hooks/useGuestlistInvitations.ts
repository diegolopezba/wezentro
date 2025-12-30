import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendPushNotification } from "@/lib/pushNotifications";

export interface GuestlistInvitation {
  id: string;
  event_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  invited_user?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Fetch invitations sent for an event (for event owner)
export function useEventInvitations(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-invitations", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from("guestlist_invitations")
        .select(`
          *,
          invited_user:profiles!guestlist_invitations_invited_user_id_fkey(
            id, username, full_name, avatar_url
          )
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GuestlistInvitation[];
    },
    enabled: !!eventId,
  });
}

// Fetch pending invitations for the current user
export function useMyPendingInvitations() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["my-invitations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("guestlist_invitations")
        .select(`
          *,
          event:events(id, title, image_url, start_datetime)
        `)
        .eq("invited_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Send invitations to multiple users
export function useSendGuestlistInvitations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      eventId, 
      userIds 
    }: { 
      eventId: string; 
      userIds: string[] 
    }) => {
      if (!user) throw new Error("Must be logged in");

      // Get inviter's profile and event details for notification
      const [{ data: inviterProfile }, { data: event }] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", user.id).single(),
        supabase.from("events").select("title").eq("id", eventId).single(),
      ]);

      const invitations = userIds.map(userId => ({
        event_id: eventId,
        inviter_id: user.id,
        invited_user_id: userId,
        status: "pending",
      }));

      const { data, error } = await supabase
        .from("guestlist_invitations")
        .insert(invitations)
        .select();

      if (error) throw error;

      // Send push notification to all invited users
      sendPushNotification({
        userIds,
        title: "Guestlist Invitation",
        body: `@${inviterProfile?.username || "Someone"} invited you to ${event?.title || "an event"}`,
        data: { type: "guestlist_invitation", eventId },
        url: `/events/${eventId}`,
      });

      return data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-invitations", eventId] });
    },
  });
}

// Respond to an invitation (accept/decline)
export function useRespondToInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      invitationId, 
      status 
    }: { 
      invitationId: string; 
      status: "accepted" | "declined" 
    }) => {
      const { data, error } = await supabase
        .from("guestlist_invitations")
        .update({ 
          status, 
          responded_at: new Date().toISOString() 
        })
        .eq("id", invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invitations", user?.id] });
    },
  });
}
