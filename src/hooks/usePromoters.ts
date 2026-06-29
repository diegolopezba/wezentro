import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Promoter {
  id: string;
  event_id: string;
  name: string;
  short_code: string;
  is_active: boolean;
  created_at: string;
}

export interface PromoterStats {
  promoter_id: string;
  name: string;
  short_code: string;
  is_active: boolean;
  clicks: number;
  gl_requests: number;
  gl_approved: number;
  checked_in: number;
  tickets_sold: number;
  revenue_bs: number;
}

export interface TicketBreakdown {
  tier_id: string;
  name: string;
  price: number;
  capacity: number | null;
  sold: number;
  revenue_bs: number;
}

export interface PromoterTotals {
  total_tickets: number;
  attributed_tickets: number;
  total_revenue: number;
  attributed_revenue: number;
  total_gl: number;
  attributed_gl: number;
}

const PROMO_KEY = (eventId: string) => ["promoters", eventId] as const;
const STATS_KEY = (eventId: string) => ["promoter-stats", eventId] as const;
const TIERS_KEY = (eventId: string) => ["ticket-breakdown", eventId] as const;
const TOTALS_KEY = (eventId: string) => ["promoter-totals", eventId] as const;

const randomCode = () =>
  Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4);

export const usePromoters = (eventId: string | undefined) =>
  useQuery({
    queryKey: PROMO_KEY(eventId || ""),
    enabled: !!eventId,
    queryFn: async (): Promise<Promoter[]> => {
      const { data, error } = await supabase
        .from("event_promoters" as any)
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Promoter[]) || [];
    },
  });

export const usePromoterStats = (eventId: string | undefined) =>
  useQuery({
    queryKey: STATS_KEY(eventId || ""),
    enabled: !!eventId,
    queryFn: async (): Promise<PromoterStats[]> => {
      const { data, error } = await supabase.rpc("get_event_promoter_stats", { _event_id: eventId });
      if (error) throw error;
      return (data as unknown as PromoterStats[]) || [];
    },
  });

export const useTicketBreakdown = (eventId: string | undefined) =>
  useQuery({
    queryKey: TIERS_KEY(eventId || ""),
    enabled: !!eventId,
    queryFn: async (): Promise<TicketBreakdown[]> => {
      const { data, error } = await supabase.rpc("get_event_ticket_breakdown", { _event_id: eventId });
      if (error) throw error;
      return (data as unknown as TicketBreakdown[]) || [];
    },
  });

export const usePromoterTotals = (eventId: string | undefined) =>
  useQuery({
    queryKey: TOTALS_KEY(eventId || ""),
    enabled: !!eventId,
    queryFn: async (): Promise<PromoterTotals | null> => {
      const { data, error } = await supabase.rpc("get_event_promoter_totals", { _event_id: eventId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as unknown as PromoterTotals) ?? null;
    },
  });

export const useCreatePromoter = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ eventId, name }: { eventId: string; name: string }) => {
      if (!user) throw new Error("auth");
      // Try a few codes in case of collision
      for (let i = 0; i < 5; i++) {
        const code = randomCode();
        const { data, error } = await supabase
          .from("event_promoters" as any)
          .insert({ event_id: eventId, created_by: user.id, name: name.trim(), short_code: code })
          .select("*")
          .single();
        if (!error) return data as unknown as Promoter;
        if (!`${error.message}`.toLowerCase().includes("duplicate")) throw error;
      }
      throw new Error("No se pudo generar código único, intenta de nuevo");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: PROMO_KEY(vars.eventId) });
      qc.invalidateQueries({ queryKey: STATS_KEY(vars.eventId) });
    },
  });
};

export const useTogglePromoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean; eventId: string }) => {
      const { error } = await supabase
        .from("event_promoters" as any)
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: PROMO_KEY(vars.eventId) });
      qc.invalidateQueries({ queryKey: STATS_KEY(vars.eventId) });
    },
  });
};

export const useDeletePromoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; eventId: string }) => {
      const { error } = await supabase.from("event_promoters" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: PROMO_KEY(vars.eventId) });
      qc.invalidateQueries({ queryKey: STATS_KEY(vars.eventId) });
    },
  });
};
