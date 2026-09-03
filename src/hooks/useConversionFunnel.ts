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
        return {
          impressions: 0,
          views: 0,
          checkoutTaps: 0,
          checkoutStarted: 0,
          purchases: 0,
          statsSince: null,
        };
      }

      const start = periodStart(period);

      // Impressions/views: daily rollup when a period is selected, all-time
      // denormalized counters when the period is "all".
      const statsQ = start
        ? supabase
            .from("event_stats_daily")
            .select("impressions, views")
            .in("event_id", eventIds)
            .gte("day", start.slice(0, 10))
        : supabase.from("event_stats").select("impression_count, view_count").in("event_id", eventIds);

      // Earliest day we have daily data for — used to warn when the selected
      // window starts before the rollup existed.
      const sinceQ = start
        ? supabase
            .from("event_stats_daily")
            .select("day")
            .in("event_id", eventIds)
            .order("day", { ascending: true })
            .limit(1)
            .maybeSingle()
        : null;

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

      const [statsRes, tapsRes, sessionsRes, sinceRes] = await Promise.all([
        statsQ,
        tapsQ,
        sessionsQ,
        sinceQ ?? Promise.resolve(null),
      ]);

      const statsRows = (statsRes.data || []) as Array<Record<string, number | null>>;
      const impressions = statsRows.reduce(
        (s, r) => s + Number(r.impressions ?? r.impression_count ?? 0),
        0
      );
      const views = statsRows.reduce((s, r) => s + Number(r.views ?? r.view_count ?? 0), 0);
      const sessions = sessionsRes.data || [];
      const purchases = sessions.filter((s) => s.status === "confirmed").length;

      const firstDay = (sinceRes as { data?: { day: string } | null } | null)?.data?.day ?? null;
      const statsSince = start && firstDay && firstDay > start.slice(0, 10) ? firstDay : null;

      return {
        impressions,
        views,
        checkoutTaps: tapsRes.count || 0,
        checkoutStarted: sessions.length,
        purchases,
        statsSince,
      };

    },
  });
};
