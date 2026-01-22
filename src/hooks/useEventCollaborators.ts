import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EventCollaborator {
  id: string;
  event_id: string;
  user_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  user?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Fetch collaborators for a specific event
export const useEventCollaborators = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-collaborators", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from("event_collaborators" as any)
        .select(`
          id,
          event_id,
          user_id,
          invited_by,
          status,
          created_at,
          responded_at
        `)
        .eq("event_id", eventId);

      if (error) throw error;
      
      // Fetch user profiles separately
      const collaborators = data || [];
      const userIds = collaborators.map((c: any) => c.user_id);
      
      if (userIds.length === 0) return [] as EventCollaborator[];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return collaborators.map((c: any) => ({
        ...c,
        user: profileMap.get(c.user_id) || undefined,
      })) as EventCollaborator[];
    },
    enabled: !!eventId,
  });
};

// Fetch accepted collaborators for an event
export const useAcceptedCollaborators = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-collaborators-accepted", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from("event_collaborators" as any)
        .select(`
          id,
          event_id,
          user_id,
          invited_by,
          status,
          created_at,
          responded_at
        `)
        .eq("event_id", eventId)
        .eq("status", "accepted");

      if (error) throw error;
      
      const collaborators = data || [];
      const userIds = collaborators.map((c: any) => c.user_id);
      
      if (userIds.length === 0) return [] as EventCollaborator[];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return collaborators.map((c: any) => ({
        ...c,
        user: profileMap.get(c.user_id) || undefined,
      })) as EventCollaborator[];
    },
    enabled: !!eventId,
  });
};

// Fetch pending collaboration invites for the current user
export const usePendingCollaborations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-collaborations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("event_collaborators" as any)
        .select(`
          id,
          event_id,
          user_id,
          invited_by,
          status,
          created_at,
          responded_at
        `)
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      
      const collaborations = data || [];
      const eventIds = collaborations.map((c: any) => c.event_id);
      const inviterIds = collaborations.map((c: any) => c.invited_by);
      
      if (eventIds.length === 0) return [];
      
      // Fetch events
      const { data: events } = await supabase
        .from("events")
        .select("id, title, image_url, creator_id")
        .in("id", eventIds);
      
      // Fetch inviter profiles
      const { data: inviterProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", inviterIds);
      
      const eventMap = new Map((events || []).map(e => [e.id, e]));
      const inviterMap = new Map((inviterProfiles || []).map(p => [p.id, p]));
      
      return collaborations.map((c: any) => ({
        ...c,
        event: eventMap.get(c.event_id),
        inviter: inviterMap.get(c.invited_by),
      }));
    },
    enabled: !!user?.id,
  });
};

// Invite a collaborator to an event
export const useInviteCollaborator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("event_collaborators" as any)
        .insert({
          event_id: eventId,
          user_id: userId,
          invited_by: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-collaborators", variables.eventId] });
    },
  });
};

// Respond to a collaboration invite (accept/decline)
export const useRespondToCollaboration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      collaborationId, 
      status 
    }: { 
      collaborationId: string; 
      status: "accepted" | "declined";
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("event_collaborators" as any)
        .update({ 
          status, 
          responded_at: new Date().toISOString() 
        })
        .eq("id", collaborationId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-collaborations"] });
      queryClient.invalidateQueries({ queryKey: ["event-collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["user-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["for-you-events"] });
      queryClient.invalidateQueries({ queryKey: ["following-events"] });
    },
  });
};

// Remove a collaborator from an event
export const useRemoveCollaborator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collaborationId, eventId }: { collaborationId: string; eventId: string }) => {
      const { error } = await supabase
        .from("event_collaborators" as any)
        .delete()
        .eq("id", collaborationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-collaborators", variables.eventId] });
    },
  });
};

// Check if current user is a collaborator on an event
export const useIsCollaborator = (eventId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-collaborator", eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user?.id) return false;

      const { data, error } = await supabase
        .from("event_collaborators" as any)
        .select("id, status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!eventId && !!user?.id,
  });
};
