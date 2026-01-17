import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EventPerformance {
  id: string;
  title: string;
  image_url: string | null;
  start_datetime: string;
  guestlist_requests: number;
  approved_guests: number;
  checked_in: number;
  likes_count: number;
  views_count: number;
}

export interface OverviewStats {
  totalEvents: number;
  totalGuestlistSignups: number;
  totalCheckIns: number;
  totalFollowers: number;
}

export interface GuestlistFunnelData {
  invitationsSent: number;
  invitationsAccepted: number;
  guestlistJoins: number;
  approved: number;
  checkedIn: number;
}

export interface GuestlistStatusBreakdown {
  pending: number;
  approved: number;
  rejected: number;
  checkedIn: number;
}

export const useOverviewStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-overview-stats", user?.id],
    queryFn: async (): Promise<OverviewStats> => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get total events created by user
      const { count: totalEvents } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .is("deleted_at", null);

      // Get all events created by user to query guestlist data
      const { data: userEvents } = await supabase
        .from("events")
        .select("id")
        .eq("creator_id", user.id)
        .is("deleted_at", null);

      const eventIds = userEvents?.map((e) => e.id) || [];

      // Get total guestlist signups across all events
      let totalGuestlistSignups = 0;
      let totalCheckIns = 0;

      if (eventIds.length > 0) {
        const { count: signups } = await supabase
          .from("guestlist_entries")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds);

        const { count: checkIns } = await supabase
          .from("guestlist_entries")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds)
          .not("checked_in_at", "is", null);

        totalGuestlistSignups = signups || 0;
        totalCheckIns = checkIns || 0;
      }

      // Get total followers
      const { count: totalFollowers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      return {
        totalEvents: totalEvents || 0,
        totalGuestlistSignups,
        totalCheckIns,
        totalFollowers: totalFollowers || 0,
      };
    },
    enabled: !!user?.id,
  });
};

export const useEventPerformance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-event-performance", user?.id],
    queryFn: async (): Promise<EventPerformance[]> => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get all events created by user with guestlist data
      const { data: events, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          image_url,
          start_datetime,
          guestlist_entries(id, status, checked_in_at),
          event_likes(id)
        `)
        .eq("creator_id", user.id)
        .is("deleted_at", null)
        .order("start_datetime", { ascending: false });

      if (error) throw error;

      // Get views from event_interactions
      const eventIds = events?.map((e) => e.id) || [];
      let viewsMap: Record<string, number> = {};

      if (eventIds.length > 0) {
        const { data: interactions } = await supabase
          .from("event_interactions")
          .select("event_id")
          .in("event_id", eventIds)
          .eq("type", "view");

        if (interactions) {
          viewsMap = interactions.reduce((acc, curr) => {
            acc[curr.event_id] = (acc[curr.event_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      return (events || []).map((event) => {
        const entries = event.guestlist_entries || [];
        return {
          id: event.id,
          title: event.title || "Untitled Event",
          image_url: event.image_url,
          start_datetime: event.start_datetime,
          guestlist_requests: entries.length,
          approved_guests: entries.filter((e: any) => e.status === "approved").length,
          checked_in: entries.filter((e: any) => e.checked_in_at !== null).length,
          likes_count: event.event_likes?.length || 0,
          views_count: viewsMap[event.id] || 0,
        };
      });
    },
    enabled: !!user?.id,
  });
};

export const useGuestlistFunnel = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-guestlist-funnel", user?.id],
    queryFn: async (): Promise<GuestlistFunnelData> => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get all events created by user
      const { data: userEvents } = await supabase
        .from("events")
        .select("id")
        .eq("creator_id", user.id)
        .is("deleted_at", null);

      const eventIds = userEvents?.map((e) => e.id) || [];

      if (eventIds.length === 0) {
        return {
          invitationsSent: 0,
          invitationsAccepted: 0,
          guestlistJoins: 0,
          approved: 0,
          checkedIn: 0,
        };
      }

      // Get invitations data
      const { count: invitationsSent } = await supabase
        .from("guestlist_invitations")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds);

      const { count: invitationsAccepted } = await supabase
        .from("guestlist_invitations")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds)
        .eq("status", "accepted");

      // Get guestlist entries data
      const { count: guestlistJoins } = await supabase
        .from("guestlist_entries")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds);

      const { count: approved } = await supabase
        .from("guestlist_entries")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds)
        .eq("status", "approved");

      const { count: checkedIn } = await supabase
        .from("guestlist_entries")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds)
        .not("checked_in_at", "is", null);

      return {
        invitationsSent: invitationsSent || 0,
        invitationsAccepted: invitationsAccepted || 0,
        guestlistJoins: guestlistJoins || 0,
        approved: approved || 0,
        checkedIn: checkedIn || 0,
      };
    },
    enabled: !!user?.id,
  });
};

export const useGuestlistStatusBreakdown = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-guestlist-status", user?.id],
    queryFn: async (): Promise<GuestlistStatusBreakdown> => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get all events created by user
      const { data: userEvents } = await supabase
        .from("events")
        .select("id")
        .eq("creator_id", user.id)
        .is("deleted_at", null);

      const eventIds = userEvents?.map((e) => e.id) || [];

      if (eventIds.length === 0) {
        return { pending: 0, approved: 0, rejected: 0, checkedIn: 0 };
      }

      const { data: entries } = await supabase
        .from("guestlist_entries")
        .select("status, checked_in_at")
        .in("event_id", eventIds);

      const breakdown = {
        pending: 0,
        approved: 0,
        rejected: 0,
        checkedIn: 0,
      };

      (entries || []).forEach((entry) => {
        if (entry.checked_in_at) {
          breakdown.checkedIn++;
        } else if (entry.status === "pending") {
          breakdown.pending++;
        } else if (entry.status === "approved") {
          breakdown.approved++;
        } else if (entry.status === "rejected") {
          breakdown.rejected++;
        }
      });

      return breakdown;
    },
    enabled: !!user?.id,
  });
};

export const useRepeatAttendees = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-repeat-attendees", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get all events created by user
      const { data: userEvents } = await supabase
        .from("events")
        .select("id")
        .eq("creator_id", user.id)
        .is("deleted_at", null);

      const eventIds = userEvents?.map((e) => e.id) || [];

      if (eventIds.length === 0) {
        return { repeatAttendees: 0, totalUniqueAttendees: 0, repeatPercentage: 0 };
      }

      const { data: entries } = await supabase
        .from("guestlist_entries")
        .select("user_id")
        .in("event_id", eventIds)
        .eq("status", "approved");

      // Count occurrences of each user
      const userCounts: Record<string, number> = {};
      (entries || []).forEach((entry) => {
        userCounts[entry.user_id] = (userCounts[entry.user_id] || 0) + 1;
      });

      const totalUniqueAttendees = Object.keys(userCounts).length;
      const repeatAttendees = Object.values(userCounts).filter((count) => count > 1).length;
      const repeatPercentage = totalUniqueAttendees > 0 
        ? Math.round((repeatAttendees / totalUniqueAttendees) * 100) 
        : 0;

      return { repeatAttendees, totalUniqueAttendees, repeatPercentage };
    },
    enabled: !!user?.id,
  });
};
