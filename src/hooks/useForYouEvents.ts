import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationContext } from "@/contexts/LocationContext";
import { EventWithCreator } from "./useEvents";

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate proximity score (30% weight)
const getProximityScore = (
  eventLat: number | null,
  eventLon: number | null,
  userLat: number | null,
  userLon: number | null
): number => {
  if (!eventLat || !eventLon || !userLat || !userLon) return 50; // Neutral score

  const distance = calculateDistance(userLat, userLon, eventLat, eventLon);

  if (distance <= 1) return 100;
  if (distance <= 5) return 80;
  if (distance <= 10) return 60;
  if (distance <= 25) return 40;
  if (distance <= 50) return 20;
  return 10;
};

// Calculate popularity score (25% weight)
const getPopularityScore = (attendeeCount: number): number => {
  if (attendeeCount >= 50) return 100;
  if (attendeeCount >= 25) return 80;
  if (attendeeCount >= 10) return 60;
  if (attendeeCount >= 5) return 40;
  if (attendeeCount >= 1) return 20;
  return 10;
};

// Calculate interest match score (25% weight)
const getInterestScore = (
  eventCategory: string | null,
  userInterests: string[] | null
): number => {
  if (!userInterests || userInterests.length === 0) return 50; // Neutral score
  if (!eventCategory) return 20;

  const normalizedCategory = eventCategory.toLowerCase();
  const normalizedInterests = userInterests.map((i) => i.toLowerCase());

  if (normalizedInterests.includes(normalizedCategory)) return 100;

  // Check for partial matches
  const hasPartialMatch = normalizedInterests.some(
    (interest) =>
      normalizedCategory.includes(interest) || interest.includes(normalizedCategory)
  );
  if (hasPartialMatch) return 70;

  return 20;
};

// Calculate recency score (15% weight)
const getRecencyScore = (createdAt: string): number => {
  const now = new Date();
  const created = new Date(createdAt);
  const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (hoursAgo <= 24) return 100;
  if (hoursAgo <= 72) return 80; // 3 days
  if (hoursAgo <= 168) return 60; // 1 week
  if (hoursAgo <= 336) return 40; // 2 weeks
  return 20;
};

// Calculate timing score (5% weight) - events happening soon
const getTimingScore = (startDatetime: string): number => {
  const now = new Date();
  const start = new Date(startDatetime);
  const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 0) return 0; // Past events (shouldn't happen due to filter)
  if (hoursUntil <= 24) return 100; // Today
  if (hoursUntil <= 48) return 80; // Tomorrow
  if (hoursUntil <= 168) return 60; // This week
  if (hoursUntil <= 720) return 40; // This month
  return 20;
};

// Calculate final score with weighted components
const calculateEventScore = (
  event: EventWithCreator & { guestlist_entries?: any[] },
  userLat: number | null,
  userLon: number | null,
  userInterests: string[] | null
): number => {
  const attendeeCount = event.guestlist_entries?.length || 0;

  const proximityScore = getProximityScore(
    event.latitude,
    event.longitude,
    userLat,
    userLon
  );
  const popularityScore = getPopularityScore(attendeeCount);
  const interestScore = getInterestScore(event.category, userInterests);
  const recencyScore = getRecencyScore(event.created_at);
  const timingScore = getTimingScore(event.start_datetime);

  // Weighted formula
  return (
    proximityScore * 0.3 +
    popularityScore * 0.25 +
    interestScore * 0.25 +
    recencyScore * 0.15 +
    timingScore * 0.05
  );
};

export const useForYouEvents = () => {
  const { user } = useAuth();
  const { location } = useLocationContext();

  // Fetch user's interests
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

  // Fetch all public events (future only)
  const {
    data: events,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["for-you-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
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
        `
        )
        .eq("is_public", true)
        .is("deleted_at", null)
        .gte("start_datetime", new Date().toISOString()) // Filter out past events
        .order("start_datetime", { ascending: true });

      if (error) throw error;
      return data as (EventWithCreator & { guestlist_entries?: any[] })[];
    },
  });

  // Score and sort events
  const scoredEvents = useMemo(() => {
    if (!events) return [];

    const userLat = location?.lat || null;
    const userLon = location?.lng || null;
    const userInterests = userProfile?.interests || null;

    return events
      .map((event) => ({
        ...event,
        _score: calculateEventScore(event, userLat, userLon, userInterests),
      }))
      .sort((a, b) => b._score - a._score);
  }, [events, location, userProfile?.interests]);

  return {
    data: scoredEvents,
    isLoading,
    error,
  };
};
