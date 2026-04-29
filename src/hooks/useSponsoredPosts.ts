import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationContext } from "@/contexts/LocationContext";
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
  target_days_of_week: number[] | null;
  target_hour_start: number | null;
  target_hour_end: number | null;
  target_timezone: string | null;
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

// Stable per-device fingerprint for guest click dedup
const FP_KEY = "zentro_ad_fp";
export const getAdFingerprint = (): string => {
  try {
    let fp = localStorage.getItem(FP_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(FP_KEY, fp);
    }
    return fp;
  } catch {
    return "anon";
  }
};

// Fetch eligible sponsored posts for the current viewer (server-side targeting)
export const useActiveSponsoredPosts = () => {
  const { user } = useAuth();
  const { location } = useLocationContext();

  return useQuery({
    queryKey: ["active-sponsored-posts", user?.id, location?.lat, location?.lng],
    queryFn: async () => {
      // Server-side targeting via RPC
      const { data: eligible, error: rpcError } = await supabase.rpc(
        "get_eligible_sponsored_posts" as any,
        {
          _user_id: user?.id ?? null,
          _lat: location?.lat ?? null,
          _lng: location?.lng ?? null,
        }
      );

      if (rpcError) {
        console.warn("Eligibility RPC failed, returning empty:", rpcError);
        return [];
      }
      const rows = (eligible || []) as Array<{
        sponsored_post_id: string;
        event_id: string;
        target_categories: string[] | null;
        target_radius_km: number | null;
        target_gender: string | null;
        target_age_min: number | null;
        target_age_max: number | null;
        preference_score: number | null;
      }>;

      if (rows.length === 0) return [];

      const eventIds = rows.map((r) => r.event_id);

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

      const eventMap = new Map((events || []).map((e: any) => [e.id, e]));

      // Preserve RPC ordering (already sorted by preference score desc + random tiebreak)
      return rows
        .map((r) => {
          const ev = eventMap.get(r.event_id);
          if (!ev) return null;
          return {
            ...ev,
            isSponsored: true as const,
            sponsoredPostId: r.sponsored_post_id,
            target_categories: r.target_categories,
            target_radius_km: r.target_radius_km != null ? Number(r.target_radius_km) : null,
            target_gender: r.target_gender,
            target_age_min: r.target_age_min,
            target_age_max: r.target_age_max,
          };
        })
        .filter(Boolean) as SponsoredEventForFeed[];
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

// Today's per-campaign spend (UTC day) for the current user's campaigns
export const useTodayDailySpend = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsored-daily-spend-today", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("sponsored_daily_spend" as any)
        .select("sponsored_post_id, spent, impressions")
        .eq("day", today);
      if (error) {
        console.warn("daily spend fetch failed", error);
        return {} as Record<string, { spent: number; impressions: number }>;
      }
      const map: Record<string, { spent: number; impressions: number }> = {};
      for (const row of (data || []) as any[]) {
        map[row.sponsored_post_id] = {
          spent: Number(row.spent || 0),
          impressions: Number(row.impressions || 0),
        };
      }
      return map;
    },
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
      target_days_of_week?: number[] | null;
      target_hour_start?: number | null;
      target_hour_end?: number | null;
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
          target_days_of_week:
            params.target_days_of_week && params.target_days_of_week.length > 0 && params.target_days_of_week.length < 7
              ? params.target_days_of_week
              : null,
          target_hour_start: params.target_hour_start ?? null,
          target_hour_end: params.target_hour_end ?? null,
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

// Track click on sponsored post (deduped server-side per viewer per day)
export const useTrackSponsoredClick = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (sponsoredPostId: string) => {
      const { error } = await supabase.rpc("increment_sponsored_clicks_v2" as any, {
        _post_id: sponsoredPostId,
        _viewer_id: user?.id ?? null,
        _fingerprint: user?.id ? null : getAdFingerprint(),
      });
      if (error) console.warn("Failed to track click:", error);
    },
  });
};
