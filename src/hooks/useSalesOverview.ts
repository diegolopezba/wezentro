import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Period } from "@/components/dashboard/PeriodSelector";

const periodStart = (period: Period): string | null => {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 86400000).toISOString();
};

export interface SalesOverview {
  revenue: number;
  tickets: number;
  avgTicket: number;
}

/** Period-scoped gross revenue + tickets from confirmed payment sessions. */
export const useSalesOverview = (period: Period) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sales-overview", user?.id, period],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<SalesOverview> => {
      let q = supabase
        .from("payment_sessions")
        .select("amount, party_size")
        .eq("business_user_id", user!.id)
        .eq("status", "confirmed");

      const start = periodStart(period);
      if (start) q = q.gte("created_at", start);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data || [];
      const revenue = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const tickets = rows.reduce((s, r) => s + Math.max(1, Number(r.party_size || 1)), 0);
      return { revenue, tickets, avgTicket: tickets ? revenue / tickets : 0 };
    },
  });
};

export interface PaceRow {
  eventId: string;
  title: string;
  startsAt: string;
  sold: number;
  capacity: number;
  daysLeft: number;
}

/** Tickets sold vs capacity for upcoming events (sales pace). */
export const useSalesPace = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sales-pace", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<PaceRow[]> => {
      const nowIso = new Date().toISOString();
      const { data: events, error } = await supabase
        .from("events")
        .select("id, title, start_datetime")
        .eq("creator_id", user!.id)
        .is("deleted_at", null)
        .gte("start_datetime", nowIso)
        .order("start_datetime", { ascending: true })
        .limit(12);
      if (error) throw error;
      const ids = (events || []).map((e) => e.id);
      if (!ids.length) return [];

      const { data: tiers, error: tErr } = await supabase
        .from("ticket_tiers")
        .select("event_id, capacity, sold_count")
        .in("event_id", ids);
      if (tErr) throw tErr;

      const agg: Record<string, { sold: number; capacity: number }> = {};
      (tiers || []).forEach((t) => {
        const a = (agg[t.event_id] ||= { sold: 0, capacity: 0 });
        a.sold += Number(t.sold_count || 0);
        a.capacity += Number(t.capacity || 0);
      });

      return (events || [])
        .filter((e) => agg[e.id])
        .map((e) => ({
          eventId: e.id,
          title: e.title,
          startsAt: e.start_datetime,
          sold: agg[e.id].sold,
          capacity: agg[e.id].capacity,
          daysLeft: Math.max(
            0,
            Math.ceil((new Date(e.start_datetime).getTime() - Date.now()) / 86400000)
          ),
        }));
    },
  });
};
