import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  price: number | null;
  has_guestlist: boolean;
  max_guestlist_capacity: number | null;
  is_public: boolean;
  creator_id: string;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface EventWithCreator extends Event {
  creator: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useEvents = () => {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      return data as EventWithCreator[];
    },
  });
};

export const useEvent = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID required");

      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("id", eventId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Event not found");
      return data as EventWithCreator;
    },
    enabled: !!eventId,
  });
};

export const useEventGuestlist = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["event-guestlist", eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID required");

      const { data, error } = await supabase
        .from("guestlist_entries")
        .select(`
          *,
          user:profiles!guestlist_entries_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("event_id", eventId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
};

export const useUserCreatedEvents = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-created-events", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            avatar_url
          ),
          guestlist_entries(count)
        `)
        .eq("creator_id", userId)
        .is("deleted_at", null)
        .order("start_datetime", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useUserJoinedEvents = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-joined-events", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      const { data, error } = await supabase
        .from("guestlist_entries")
        .select(`
          event:events(
            *,
            creator:profiles!events_creator_id_fkey(
              id,
              username,
              avatar_url
            ),
            guestlist_entries(count)
          )
        `)
        .eq("user_id", userId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data?.map((entry) => entry.event).filter(Boolean) || [];
    },
    enabled: !!userId,
  });
};
