import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithCreator } from "./useEvents";

export interface SponsoredPost {
  id: string;
  event_id: string;
  business_user_id: string;
  status: string;
  daily_budget: number | null;
  total_budget: number | null;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
}

export interface SponsoredEventForFeed extends EventWithCreator {
  guestlist_entries?: any[];
  isSponsored: true;
  sponsoredPostId: string;
}

// Fetch active sponsored posts with their event data for feed injection
export const useActiveSponsoredPosts = () => {
  return useQuery({
    queryKey: ["active-sponsored-posts"],
    queryFn: async () => {
      // Get active sponsored posts
      const { data: sponsoredPosts, error: spError } = await supabase
        .from("sponsored_posts")
        .select("id, event_id")
        .eq("status", "active");

      if (spError) throw spError;
      if (!sponsoredPosts || sponsoredPosts.length === 0) return [];

      const eventIds = sponsoredPosts.map((sp) => sp.event_id);

      // Fetch the actual event data
      const { data: events, error: evError } = await supabase
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
        .in("id", eventIds)
        .is("deleted_at", null);

      if (evError) throw evError;

      // Map sponsored post IDs to events
      const spMap = new Map(sponsoredPosts.map((sp) => [sp.event_id, sp.id]));

      return (events || []).map((event) => ({
        ...event,
        isSponsored: true as const,
        sponsoredPostId: spMap.get(event.id) || "",
      })) as SponsoredEventForFeed[];
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
};

// Fetch business user's own sponsored posts for dashboard management
export const useMySponsored = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-sponsored-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("sponsored_posts")
        .select(`
          *,
          event:events(
            id,
            title,
            image_url,
            start_datetime,
            category
          )
        `)
        .eq("business_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
};

// Create a new sponsored post
export const useCreateSponsoredPost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      event_id: string;
      daily_budget?: number;
      total_budget?: number;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sponsored_posts")
        .insert({
          event_id: params.event_id,
          business_user_id: user.id,
          daily_budget: params.daily_budget ?? null,
          total_budget: params.total_budget ?? null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-sponsored-posts"] });
    },
  });
};

// Update sponsored post status
export const useUpdateSponsoredStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; status: string }) => {
      const updateData: Record<string, any> = { status: params.status };
      if (params.status === "active") {
        updateData.start_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("sponsored_posts")
        .update(updateData)
        .eq("id", params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-sponsored-posts"] });
      queryClient.invalidateQueries({ queryKey: ["active-sponsored-posts"] });
    },
  });
};

// Track impression
export const useTrackSponsoredImpression = () => {
  return useMutation({
    mutationFn: async (sponsoredPostId: string) => {
      const { error } = await supabase.rpc("increment_sponsored_impressions" as any, {
        _post_id: sponsoredPostId,
      });
      if (error) console.warn("Failed to track impression:", error);
    },
  });
};

// Track click on sponsored post
export const useTrackSponsoredClick = () => {
  return useMutation({
    mutationFn: async (sponsoredPostId: string) => {
      const { error } = await supabase.rpc("increment_sponsored_clicks" as any, {
        _post_id: sponsoredPostId,
      });
      if (error) console.warn("Failed to track click:", error);
    },
  });
};
