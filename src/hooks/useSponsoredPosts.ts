import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithCreator } from "./useEvents";
import { toast } from "sonner";

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
  target_categories: string[] | null;
  target_radius_km: number | null;
  target_gender: string | null;
  target_age_min: number | null;
  target_age_max: number | null;
}

export interface SponsoredEventForFeed extends EventWithCreator {
  guestlist_entries?: any[];
  isSponsored: true;
  sponsoredPostId: string;
  target_categories: string[] | null;
  target_radius_km: number | null;
  target_gender: string | null;
  target_age_min: number | null;
  target_age_max: number | null;
}

// Fetch active sponsored posts with their event data for feed injection
export const useActiveSponsoredPosts = () => {
  return useQuery({
    queryKey: ["active-sponsored-posts"],
    queryFn: async () => {
      const { data: sponsoredPosts, error: spError } = await supabase
        .from("sponsored_posts")
        .select("id, event_id, target_categories, target_radius_km, target_gender, target_age_min, target_age_max")
        .eq("status", "active");

      if (spError) throw spError;
      if (!sponsoredPosts || sponsoredPosts.length === 0) return [];

      const eventIds = sponsoredPosts.map((sp) => sp.event_id);

      const { data: events, error: evError } = await supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id, username, full_name, avatar_url
          ),
          guestlist_entries(
            user:profiles!guestlist_entries_user_id_fkey(
              id, avatar_url
            )
          )
        `)
        .in("id", eventIds)
        .is("deleted_at", null);

      if (evError) throw evError;

      const spMap = new Map(sponsoredPosts.map((sp) => [sp.event_id, sp]));

      return (events || []).map((event) => {
        const sp = spMap.get(event.id);
        return {
          ...event,
          isSponsored: true as const,
          sponsoredPostId: sp?.id || "",
          target_categories: (sp as any)?.target_categories || null,
          target_radius_km: (sp as any)?.target_radius_km != null ? Number((sp as any).target_radius_km) : null,
          target_gender: (sp as any)?.target_gender || null,
          target_age_min: (sp as any)?.target_age_min || null,
          target_age_max: (sp as any)?.target_age_max || null,
        };
      }) as SponsoredEventForFeed[];
    },
    staleTime: 5 * 60 * 1000,
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
            id, title, image_url, start_datetime, category
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
      target_categories?: string[];
      target_radius_km?: number;
      target_gender?: string;
      target_age_min?: number;
      target_age_max?: number;
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
          target_categories: params.target_categories?.length ? params.target_categories : null,
          target_radius_km: params.target_radius_km ?? null,
          target_gender: params.target_gender && params.target_gender !== "all" ? params.target_gender : null,
          target_age_min: params.target_age_min ?? null,
          target_age_max: params.target_age_max ?? null,
        } as any)
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
      // Budget exhaustion guard: prevent reactivation when budget is spent
      if (params.status === "active") {
        const { data: post } = await supabase
          .from("sponsored_posts")
          .select("spent, total_budget")
          .eq("id", params.id)
          .single();

        if (post && post.total_budget && Number(post.spent) >= Number(post.total_budget)) {
          toast.error("Presupuesto agotado. Agrega más presupuesto antes de reactivar.");
          throw new Error("Budget exhausted");
        }
      }

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
