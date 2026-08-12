import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBlockedIds } from "./useBlockedUsers";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  price: number | null;
  has_guestlist: boolean;
  max_guestlist_capacity: number | null;
  is_public: boolean;
  is_post: boolean;
  creator_id: string;
  created_at: string;
  payment_qr_url: string | null;
  show_menu_button: boolean | null;
  show_reservation_button: boolean | null;
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

export const useEvents = (enabled: boolean = true) => {
  const { data: blockedIds } = useBlockedIds();
  return useQuery({
    enabled,
    queryKey: ["events", blockedIds ? Array.from(blockedIds).sort().join(",") : ""],
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
          ),
          guestlist_entries(
            user:profiles!guestlist_entries_user_id_fkey(
              id,
              avatar_url
            )
          )
        `)
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      const events = data as EventWithCreator[];
      if (blockedIds && blockedIds.size > 0) {
        return events.filter((e) => !blockedIds.has(e.creator_id));
      }
      return events;
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
          ),
          media:event_media(id, media_url, media_type, display_order, aspect_ratio)
        `)
        .eq("id", eventId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Event not found");
      // Sort media by display_order
      if (Array.isArray((data as any).media)) {
        (data as any).media.sort((a: any, b: any) => a.display_order - b.display_order);
      }
      return data as EventWithCreator & { media?: any[] };
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
        .eq("status", "approved")
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

export const useFollowingEvents = () => {
  return useQuery({
    queryKey: ["following-events"],
    queryFn: async () => {
      // First get the current user's following list
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get the list of user IDs the current user is following
      const { data: followingData, error: followingError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followingError) throw followingError;
      if (!followingData || followingData.length === 0) return [];

      const followingIds = followingData.map((f) => f.following_id);

      // Get events from followed users
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          guestlist_entries(
            user:profiles!guestlist_entries_user_id_fkey(
              id,
              avatar_url
            )
          )
        `)
        .in("creator_id", followingIds)
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      return data as EventWithCreator[];
    },
  });
};
