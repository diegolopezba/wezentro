import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Period } from "@/components/dashboard/PeriodSelector";

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
  impressions_count: number;
}

export interface OverviewStats {
  totalEvents: number;
  totalGuestlistSignups: number;
  totalCheckIns: number;
  totalFollowers: number;
  totalReservations: number;
  totalLikes: number;
  totalViews: number;
  followerTrend: { value: number; isPositive: boolean } | null;
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

function periodToMs(period: Period): number {
  if (period === "7d") return 7 * 86400000;
  if (period === "30d") return 30 * 86400000;
  return 365 * 5 * 86400000; // "all" = 5 years
}

function periodStartISO(period: Period): string {
  return new Date(Date.now() - periodToMs(period)).toISOString();
}

// Helper to get user event IDs
async function getUserEventIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("events").select("id").eq("creator_id", userId).is("deleted_at", null);
  return data?.map((e) => e.id) || [];
}

export const useOverviewStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["business-overview-stats", user?.id],
    queryFn: async (): Promise<OverviewStats> => {
      if (!user?.id) throw new Error("User not authenticated");
      const { count: totalEvents } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("creator_id", user.id).is("deleted_at", null);
      const eventIds = await getUserEventIds(user.id);
      let totalGuestlistSignups = 0, totalCheckIns = 0, totalLikes = 0, totalViews = 0;
      if (eventIds.length > 0) {
        const [signupsRes, checkInsRes, likesRes, viewsRes] = await Promise.all([
          supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", eventIds),
          supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", eventIds).not("checked_in_at", "is", null),
          supabase.from("event_likes").select("*", { count: "exact", head: true }).in("event_id", eventIds),
          supabase.from("event_interactions").select("*", { count: "exact", head: true }).in("event_id", eventIds).eq("type", "view"),
        ]);
        totalGuestlistSignups = signupsRes.count || 0;
        totalCheckIns = checkInsRes.count || 0;
        totalLikes = likesRes.count || 0;
        totalViews = viewsRes.count || 0;
      }
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
      const [followersRes, recentFollowersRes, prevFollowersRes, reservationsRes] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id).gte("created_at", sevenDaysAgo),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
        supabase.from("reservations").select("*", { count: "exact", head: true }).eq("business_id", user.id),
      ]);
      const recentCount = recentFollowersRes.count || 0;
      const prevCount = prevFollowersRes.count || 0;
      let followerTrend: { value: number; isPositive: boolean } | null = null;
      if (prevCount > 0) {
        const change = Math.round(((recentCount - prevCount) / prevCount) * 100);
        followerTrend = { value: Math.abs(change), isPositive: change >= 0 };
      } else if (recentCount > 0) {
        followerTrend = { value: 100, isPositive: true };
      }
      return { totalEvents: totalEvents || 0, totalGuestlistSignups, totalCheckIns, totalFollowers: followersRes.count || 0, totalReservations: reservationsRes.count || 0, totalLikes, totalViews, followerTrend };
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
      const { data: events, error } = await supabase
        .from("events")
        .select(`id, title, image_url, start_datetime, guestlist_entries(id, status, checked_in_at), event_likes(id)`)
        .eq("creator_id", user.id).is("deleted_at", null).order("start_datetime", { ascending: false });
      if (error) throw error;
      const eventIds = events?.map((e) => e.id) || [];
      let viewsMap: Record<string, number> = {};
      let impressionsMap: Record<string, number> = {};
      if (eventIds.length > 0) {
        const { data: interactions } = await supabase
          .from("event_interactions")
          .select("event_id, type")
          .in("event_id", eventIds)
          .in("type", ["view", "impression"]);
        (interactions || []).forEach((curr) => {
          if (curr.type === "view") {
            viewsMap[curr.event_id] = (viewsMap[curr.event_id] || 0) + 1;
          } else if (curr.type === "impression") {
            impressionsMap[curr.event_id] = (impressionsMap[curr.event_id] || 0) + 1;
          }
        });
      }
      return (events || []).map((event) => {
        const entries = event.guestlist_entries || [];
        return {
          id: event.id, title: event.title || "Untitled Event", image_url: event.image_url, start_datetime: event.start_datetime,
          guestlist_requests: entries.length, approved_guests: entries.filter((e: any) => e.status === "approved").length,
          checked_in: entries.filter((e: any) => e.checked_in_at !== null).length,
          likes_count: event.event_likes?.length || 0,
          views_count: viewsMap[event.id] || 0,
          impressions_count: impressionsMap[event.id] || 0,
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
      const eventIds = await getUserEventIds(user.id);
      if (eventIds.length === 0) return { invitationsSent: 0, invitationsAccepted: 0, guestlistJoins: 0, approved: 0, checkedIn: 0 };
      const [invSent, invAccepted, joins, approved, checkedIn] = await Promise.all([
        supabase.from("guestlist_invitations").select("*", { count: "exact", head: true }).in("event_id", eventIds),
        supabase.from("guestlist_invitations").select("*", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "accepted"),
        supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", eventIds),
        supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", eventIds).eq("status", "approved"),
        supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", eventIds).not("checked_in_at", "is", null),
      ]);
      return { invitationsSent: invSent.count || 0, invitationsAccepted: invAccepted.count || 0, guestlistJoins: joins.count || 0, approved: approved.count || 0, checkedIn: checkedIn.count || 0 };
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
      const eventIds = await getUserEventIds(user.id);
      if (eventIds.length === 0) return { pending: 0, approved: 0, rejected: 0, checkedIn: 0 };
      const { data: entries } = await supabase.from("guestlist_entries").select("status, checked_in_at").in("event_id", eventIds);
      const breakdown = { pending: 0, approved: 0, rejected: 0, checkedIn: 0 };
      (entries || []).forEach((entry) => {
        if (entry.checked_in_at) breakdown.checkedIn++;
        else if (entry.status === "pending") breakdown.pending++;
        else if (entry.status === "approved") breakdown.approved++;
        else if (entry.status === "rejected") breakdown.rejected++;
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
      const eventIds = await getUserEventIds(user.id);
      if (eventIds.length === 0) return { repeatAttendees: 0, totalUniqueAttendees: 0, repeatPercentage: 0 };
      const { data: entries } = await supabase.from("guestlist_entries").select("user_id").in("event_id", eventIds).eq("status", "approved");
      const userCounts: Record<string, number> = {};
      (entries || []).forEach((entry) => { userCounts[entry.user_id] = (userCounts[entry.user_id] || 0) + 1; });
      const totalUniqueAttendees = Object.keys(userCounts).length;
      const repeatAttendees = Object.values(userCounts).filter((count) => count > 1).length;
      const repeatPercentage = totalUniqueAttendees > 0 ? Math.round((repeatAttendees / totalUniqueAttendees) * 100) : 0;
      return { repeatAttendees, totalUniqueAttendees, repeatPercentage };
    },
    enabled: !!user?.id,
  });
};

// ==================== NEW HOOKS ====================

export const useAccountsReached = (period: Period) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["accounts-reached", user?.id, period],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const eventIds = await getUserEventIds(user.id);
      if (eventIds.length === 0) return { count: 0, trend: null };

      const start = periodStartISO(period);
      const prevStart = new Date(Date.now() - periodToMs(period) * 2).toISOString();

      const { data: current } = await supabase.from("event_interactions").select("user_id").in("event_id", eventIds).eq("type", "view").gte("created_at", start);
      const uniqueCurrent = new Set((current || []).map((r) => r.user_id).filter(Boolean)).size;

      const { data: prev } = await supabase.from("event_interactions").select("user_id").in("event_id", eventIds).eq("type", "view").gte("created_at", prevStart).lt("created_at", start);
      const uniquePrev = new Set((prev || []).map((r) => r.user_id).filter(Boolean)).size;

      let trend: { value: number; isPositive: boolean } | null = null;
      if (uniquePrev > 0) {
        const change = Math.round(((uniqueCurrent - uniquePrev) / uniquePrev) * 100);
        trend = { value: Math.abs(change), isPositive: change >= 0 };
      } else if (uniqueCurrent > 0) {
        trend = { value: 100, isPositive: true };
      }

      return { count: uniqueCurrent, trend };
    },
    enabled: !!user?.id,
  });
};

export const useInteractionSummary = (period: Period) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["interaction-summary", user?.id, period],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const eventIds = await getUserEventIds(user.id);
      if (eventIds.length === 0) return { views: 0, shares: 0, likes: 0, guestlistJoins: 0 };

      const start = periodStartISO(period);
      const { data } = await supabase.from("event_interactions").select("type").in("event_id", eventIds).gte("created_at", start);

      const summary = { views: 0, shares: 0, likes: 0, guestlistJoins: 0 };
      (data || []).forEach((r) => {
        if (r.type === "view") summary.views++;
        else if (r.type === "share") summary.shares++;
      });

      // Also count likes and guestlist joins from their tables
      const [likesRes, joinsRes] = await Promise.all([
        supabase.from("event_likes").select("*", { count: "exact", head: true }).in("event_id", eventIds).gte("created_at", start),
        supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", eventIds).gte("joined_at", start),
      ]);
      summary.likes = likesRes.count || 0;
      summary.guestlistJoins = joinsRes.count || 0;

      return summary;
    },
    enabled: !!user?.id,
  });
};

export const useProfileVisits = (period: Period) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile-visits", user?.id, period],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const start = periodStartISO(period);
      const prevStart = new Date(Date.now() - periodToMs(period) * 2).toISOString();

      const [currentRes, prevRes] = await Promise.all([
        supabase.from("profile_visits").select("*", { count: "exact", head: true }).eq("profile_id", user.id).gte("created_at", start),
        supabase.from("profile_visits").select("*", { count: "exact", head: true }).eq("profile_id", user.id).gte("created_at", prevStart).lt("created_at", start),
      ]);

      const current = currentRes.count || 0;
      const prev = prevRes.count || 0;
      let trend: { value: number; isPositive: boolean } | null = null;
      if (prev > 0) {
        const change = Math.round(((current - prev) / prev) * 100);
        trend = { value: Math.abs(change), isPositive: change >= 0 };
      } else if (current > 0) {
        trend = { value: 100, isPositive: true };
      }
      return { count: current, trend };
    },
    enabled: !!user?.id,
  });
};

export const useAudienceDemographics = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["audience-demographics", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const eventIds = await getUserEventIds(user.id);
      if (eventIds.length === 0) return undefined;

      // Get unique user IDs who interacted
      const { data: interactions } = await supabase.from("event_interactions").select("user_id").in("event_id", eventIds);
      const uniqueUserIds = [...new Set((interactions || []).map((i) => i.user_id).filter(Boolean))];

      if (uniqueUserIds.length < 10) return undefined;

      // Get profiles of interactors (batch)
      const { data: profiles } = await supabase.from("profiles").select("birth_date, gender, city").in("id", uniqueUserIds.slice(0, 500));

      if (!profiles) return undefined;

      // Age buckets
      const now = new Date();
      const ageBuckets: Record<string, number> = { "18-24": 0, "25-34": 0, "35-44": 0, "45+": 0 };
      profiles.forEach((p) => {
        if (!p.birth_date) return;
        const age = Math.floor((now.getTime() - new Date(p.birth_date).getTime()) / (365.25 * 86400000));
        if (age >= 18 && age <= 24) ageBuckets["18-24"]++;
        else if (age >= 25 && age <= 34) ageBuckets["25-34"]++;
        else if (age >= 35 && age <= 44) ageBuckets["35-44"]++;
        else if (age >= 45) ageBuckets["45+"]++;
      });

      // Gender split
      const genderMap: Record<string, number> = {};
      profiles.forEach((p) => {
        const g = p.gender || "No especificado";
        genderMap[g] = (genderMap[g] || 0) + 1;
      });

      // Top cities
      const cityMap: Record<string, number> = {};
      profiles.forEach((p) => {
        if (!p.city) return;
        cityMap[p.city] = (cityMap[p.city] || 0) + 1;
      });

      return {
        ageBuckets: Object.entries(ageBuckets).map(([name, count]) => ({ name, count })).filter(b => b.count > 0),
        genderSplit: Object.entries(genderMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        topCities: Object.entries(cityMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      };
    },
    enabled: !!user?.id,
  });
};

export const useFollowerGrowthChart = (days: number) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["follower-growth-chart", user?.id, days],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");
      const start = new Date(Date.now() - days * 86400000).toISOString();

      const { data: follows } = await supabase.from("follows").select("created_at").eq("following_id", user.id).gte("created_at", start).order("created_at", { ascending: true });

      // Get total followers before period
      const { count: baseLine } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id).lt("created_at", start);

      let cumulative = baseLine || 0;
      const dayMap: Record<string, number> = {};

      (follows || []).forEach((f) => {
        const day = f.created_at?.split("T")[0] || "";
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      const result = [];
      for (let i = days; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().split("T")[0];
        cumulative += dayMap[key] || 0;
        result.push({ day: key.slice(5), total: cumulative });
      }
      return result;
    },
    enabled: !!user?.id,
  });
};

export const useCompetitiveBenchmark = () => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["competitive-benchmark", user?.id, profile?.business_type],
    queryFn: async () => {
      if (!user?.id || !profile?.business_type) throw new Error("No user/type");

      // Get all businesses of same type
      const { data: peers } = await supabase.from("profiles").select("id").eq("is_business", true).eq("business_type", profile.business_type);
      const peerIds = (peers || []).map((p) => p.id).filter((id) => id !== user.id);

      if (peerIds.length === 0) return null;

      // Your stats
      const yourEventIds = await getUserEventIds(user.id);
      let yourTotalReach = 0, yourTotalEngagement = 0, yourTotalGuestlistFill = 0;
      const yourEventCount = yourEventIds.length || 1;

      if (yourEventIds.length > 0) {
        const { data: yourViews } = await supabase.from("event_interactions").select("user_id").in("event_id", yourEventIds).eq("type", "view");
        yourTotalReach = new Set((yourViews || []).map(v => v.user_id).filter(Boolean)).size;
        const { count: yourLikes } = await supabase.from("event_likes").select("*", { count: "exact", head: true }).in("event_id", yourEventIds);
        const { count: yourJoins } = await supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", yourEventIds);
        const totalActions = (yourLikes || 0) + (yourJoins || 0);
        yourTotalEngagement = yourTotalReach > 0 ? (totalActions / yourTotalReach) * 100 : 0;

        // Guestlist fill
        const { data: glEvents } = await supabase.from("events").select("id, max_guestlist_capacity").in("id", yourEventIds).not("max_guestlist_capacity", "is", null);
        if (glEvents && glEvents.length > 0) {
          const totalCap = glEvents.reduce((s, e) => s + (e.max_guestlist_capacity || 0), 0);
          yourTotalGuestlistFill = totalCap > 0 ? ((yourJoins || 0) / totalCap) * 100 : 0;
        }
      }

      const { count: yourFollowers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id);

      // Platform averages (sample up to 20 peers)
      const samplePeers = peerIds.slice(0, 20);
      let platformTotalReach = 0, platformTotalEngagement = 0, platformTotalFollowers = 0, platformTotalGuestlistFill = 0;
      let peerCount = 0;

      for (const peerId of samplePeers) {
        const peerEventIds = await getUserEventIds(peerId);
        if (peerEventIds.length === 0) continue;
        peerCount++;

        const { data: peerViews } = await supabase.from("event_interactions").select("user_id").in("event_id", peerEventIds).eq("type", "view");
        const peerReach = new Set((peerViews || []).map(v => v.user_id).filter(Boolean)).size;
        platformTotalReach += peerReach / peerEventIds.length;

        const { count: peerLikes } = await supabase.from("event_likes").select("*", { count: "exact", head: true }).in("event_id", peerEventIds);
        const { count: peerJoins } = await supabase.from("guestlist_entries").select("*", { count: "exact", head: true }).in("event_id", peerEventIds);
        platformTotalEngagement += peerReach > 0 ? (((peerLikes || 0) + (peerJoins || 0)) / peerReach) * 100 : 0;

        const { count: peerFollowers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", peerId);
        platformTotalFollowers += peerFollowers || 0;
      }

      const avg = (v: number) => peerCount > 0 ? v / peerCount : 0;

      return {
        yourAvgReach: yourTotalReach / yourEventCount,
        platformAvgReach: avg(platformTotalReach),
        yourEngagement: yourTotalEngagement,
        platformEngagement: avg(platformTotalEngagement),
        yourFollowers: yourFollowers || 0,
        platformFollowers: avg(platformTotalFollowers),
        yourGuestlistFill: yourTotalGuestlistFill,
        platformGuestlistFill: avg(platformTotalGuestlistFill),
      };
    },
    enabled: !!user?.id && !!profile?.business_type,
    staleTime: 5 * 60 * 1000, // cache 5 min since this is expensive
  });
};
