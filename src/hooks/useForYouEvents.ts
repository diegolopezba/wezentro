import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationContext } from "@/contexts/LocationContext";
import { useUserPreferences } from "./useUserPreferences";
import { EventWithCreator } from "./useEvents";
import {
  calculateEventScore,
  injectExploration,
  ScoringContext,
} from "@/lib/feedScoring";

export const useForYouEvents = () => {
  const { user } = useAuth();
  const { location } = useLocationContext();
  const userId = user?.id;

  // Fetch user's learned preferences
  const { data: learnedPrefs } = useUserPreferences(userId);

  // Fetch user's interests from profile
  const { data: userProfile } = useQuery({
    queryKey: ["user-interests", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's following list
  const { data: following } = useQuery({
    queryKey: ["user-following-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (error) throw error;
      return data.map((f) => f.following_id);
    },
    enabled: !!user?.id,
  });

  // Fetch trending velocity (interaction counts in last 24h)
  const { data: trendingData } = useQuery({
    queryKey: ["trending-counts"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("event_interactions")
        .select("event_id")
        .gte("created_at", twentyFourHoursAgo);

      if (error) {
        console.error("Error fetching trending data:", error);
        return {};
      }

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.event_id] = (counts[row.event_id] || 0) + 1;
      }
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });

  // NEW: Fetch creator attendance counts (how many events user attended per creator)
  const { data: creatorAttendance } = useQuery({
    queryKey: ["creator-attendance", userId],
    queryFn: async () => {
      if (!userId) return {};
      const { data, error } = await supabase
        .from("guestlist_entries")
        .select("event_id, events!guestlist_entries_event_id_fkey(creator_id)")
        .eq("user_id", userId)
        .eq("status", "approved");

      if (error) {
        console.error("Error fetching creator attendance:", error);
        return {};
      }

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        const creatorId = (row as any).events?.creator_id;
        if (creatorId) {
          counts[creatorId] = (counts[creatorId] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  // NEW: Fetch day-of-week preferences for today
  const { data: dayOfWeekPrefs } = useQuery({
    queryKey: ["day-of-week-prefs", userId],
    queryFn: async () => {
      if (!userId) return {};
      const today = new Date().getDay();
      const { data, error } = await supabase
        .from("user_day_preferences")
        .select("category, score")
        .eq("user_id", userId)
        .eq("day_of_week", today);

      if (error) {
        console.error("Error fetching day-of-week prefs:", error);
        return {};
      }

      const prefs: Record<string, number> = {};
      for (const row of data || []) {
        prefs[row.category] = Number(row.score) || 0;
      }
      return prefs;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch all public events
  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["for-you-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          creator:profiles!events_creator_id_fkey(
            id, username, full_name, avatar_url
          ),
          guestlist_entries(
            user:profiles!guestlist_entries_user_id_fkey(
              id, avatar_url
            )
          )
        `
        )
        .eq("is_public", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (EventWithCreator & { guestlist_entries?: any[] })[];
    },
  });

  // Score, sort, and inject exploration
  const scoredEvents = useMemo(() => {
    if (!events) return [];

    const now = new Date();
    const categoryPrefs = learnedPrefs?.categories || {};
    const creatorPrefs = learnedPrefs?.creators || {};

    const ctx: ScoringContext = {
      userLat: location?.lat || null,
      userLon: location?.lng || null,
      userInterests: userProfile?.interests || null,
      followingIds: following || null,
      categoryPrefs,
      creatorPrefs,
      trendingCounts: trendingData || {},
      creatorAttendance: creatorAttendance || {},
      dayOfWeekPrefs: dayOfWeekPrefs || {},
    };

    // Filter: posts always show, events must be in the future
    const filtered = events.filter((e) => {
      if (!e.start_datetime) return true;
      return new Date(e.start_datetime) >= now;
    });

    const scored = filtered
      .map((event) => ({
        ...event,
        _score: calculateEventScore(event, ctx),
      }))
      .sort((a, b) => b._score - a._score);

    // Inject 15% exploration content to prevent echo chambers
    return injectExploration(scored, categoryPrefs);
  }, [events, location, userProfile?.interests, following, learnedPrefs, trendingData, creatorAttendance, dayOfWeekPrefs]);

  return {
    data: scoredEvents,
    isLoading,
    error,
    refetch,
  };
};
