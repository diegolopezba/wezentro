import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Period } from "@/components/dashboard/PeriodSelector";

export interface FunnelData {
  impressions: number;
  views: number;
  checkoutTaps: number;
  checkoutStarted: number;
  purchases: number;
  /** First day with daily impression/view data, when the period predates it. */
  statsSince: string | null;
}


const periodStart = (period: Period): string | null => {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 86400000).toISOString();
};

/**
 * Conversion funnel: impression -> detail view -> "Comprar" tap -> checkout -> purchase.
 *
 * Impressions/views come from the denormalized `event_stats` counters, which are
 * all-time per event (raw rows are no longer stored). Checkout taps and payment
 * sessions are timestamped and respect the period filter.
 */
export const useConversionFunnel = (period: Period, eventId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversion-funnel", user?.id, eventId ?? "all", period],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<FunnelData> => {
      let eventIds: string[] = [];

      if (eventId) {
        eventIds = [eventId];
      } else {
        const { data: events } = await supabase
          .from("events")
          .select("id")
          .eq("creator_id", user!.id)
          .is("deleted_at", null);
        eventIds = (events || []).map((e) => e.id);
      }

      if (eventIds.length === 0) {
        return { impressions: 0, views: 0, checkoutTaps: 0, checkoutStarted: 0, purchases: 0 };
      }

      const start = periodStart(period);

      const statsQ = supabase
        .from("event_stats")
        .select("impression_count, view_count")
        .in("event_id", eventIds);

      let tapsQ = supabase
        .from("event_interactions")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds)
        .eq("type", "checkout_tap");
      if (start) tapsQ = tapsQ.gte("created_at", start);

      let sessionsQ = supabase
        .from("payment_sessions")
        .select("status")
        .in("event_id", eventIds);
      if (start) sessionsQ = sessionsQ.gte("created_at", start);

      const [statsRes, tapsRes, sessionsRes] = await Promise.all([statsQ, tapsQ, sessionsQ]);

      const impressions = (statsRes.data || []).reduce((s, r) => s + Number(r.impression_count || 0), 0);
      const views = (statsRes.data || []).reduce((s, r) => s + Number(r.view_count || 0), 0);
      const sessions = sessionsRes.data || [];
      const purchases = sessions.filter((s) => s.status === "confirmed").length;

      return {
        impressions,
        views,
        checkoutTaps: tapsRes.count || 0,
        checkoutStarted: sessions.length,
        purchases,
      };
    },
  });
};
