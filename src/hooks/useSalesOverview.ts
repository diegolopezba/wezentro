import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { feeOf, netOf } from "@/lib/platformFee";
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
  /** Total commission withheld from the gross revenue (6%). */
  platformFee: number;
  /** Amount paid out to the organizer (94% of gross). */
  netPayout: number;
}


/**
 * Period-scoped gross revenue + tickets from confirmed customer payments.
 *
 * Subscription charges (the business paying Zentro for its plan) are excluded:
 * they share the `payment_sessions` table but are not sales to customers.
 * One lounge/area booking counts as one unit, not `party_size` guests.
 */
export const useSalesOverview = (period: Period) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sales-overview", user?.id, period],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<SalesOverview> => {
      let q = supabase
        .from("payment_sessions")
        .select("amount, base_amount, quantity, event_id, event_area_id, subscription_tier")
        .eq("business_user_id", user!.id)
        .eq("status", "confirmed")
        .is("subscription_tier", null)
        .not("event_id", "is", null);

      const start = periodStart(period);
      if (start) q = q.gte("created_at", start);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data || [];
      // Revenue is what the buyer paid for the ticket/lounge itself; the
      // gateway fee added on top is not organizer revenue.
      const gross = (r: { amount: number | null; base_amount: number | null }) =>
        Number(r.base_amount ?? r.amount ?? 0);

      const revenue = rows.reduce((s, r) => s + gross(r), 0);
      const tickets = rows.reduce(
        (s, r) => s + (r.event_area_id ? 1 : Math.max(1, Number(r.quantity || 1))),
        0
      );
      const platformFee = rows.reduce((s, r) => s + feeOf(gross(r)), 0);
      const netPayout = rows.reduce((s, r) => s + netOf(gross(r)), 0);

      return {
        revenue,
        tickets,
        avgTicket: tickets ? revenue / tickets : 0,
        platformFee,
        netPayout,
      };
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

/**
 * Sales pace for upcoming events: tickets sold plus lounge/area bookings,
 * against the combined capacity. Events with no capacity configured still
 * appear (capacity 0 → the UI shows the sold count without a percentage).
 */
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

      const [tiersRes, areasRes] = await Promise.all([
        supabase.from("ticket_tiers").select("event_id, capacity, sold_count").in("event_id", ids),
        supabase
          .from("event_areas")
          .select("id, event_id, is_active, is_decor, price")
          .in("event_id", ids),
      ]);
      if (tiersRes.error) throw tiersRes.error;
      if (areasRes.error) throw areasRes.error;

      const sellableAreas = (areasRes.data || []).filter((a) => a.is_active && !a.is_decor);
      const areaIds = sellableAreas.map((a) => a.id);

      let bookings: { event_area_id: string }[] = [];
      if (areaIds.length) {
        const { data: b, error: bErr } = await supabase
          .from("area_bookings")
          .select("event_area_id")
          .in("event_area_id", areaIds)
          .eq("status", "confirmed");
        if (bErr) throw bErr;
        bookings = b || [];
      }

      const areaEventById = new Map(sellableAreas.map((a) => [a.id, a.event_id]));

      const agg: Record<string, { sold: number; capacity: number }> = {};
      const bucket = (id: string) => (agg[id] ||= { sold: 0, capacity: 0 });

      (tiersRes.data || []).forEach((t) => {
        const a = bucket(t.event_id);
        a.sold += Number(t.sold_count || 0);
        a.capacity += Number(t.capacity || 0);
      });
      sellableAreas.forEach((area) => {
        bucket(area.event_id).capacity += 1;
      });
      bookings.forEach((b) => {
        const eventId = areaEventById.get(b.event_area_id);
        if (eventId) bucket(eventId).sold += 1;
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
