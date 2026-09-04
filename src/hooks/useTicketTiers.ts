import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  sold_count: number;
  display_order: number;
  unlock_after_tier_id: string | null;
  is_active: boolean;
  /** Optional moment when this tier stops selling. */
  sales_end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketTierInput {
  name: string;
  description?: string | null;
  price: number;
  capacity?: number | null;
  display_order: number;
  unlock_after_tier_id?: string | null;
  sales_end_at?: string | null;
}


const TIERS_KEY = (eventId?: string) => ["ticket-tiers", eventId] as const;

/** Fetch all tiers for an event, ordered by display_order. */
export const useTicketTiers = (eventId: string | undefined) => {
  return useQuery({
    queryKey: TIERS_KEY(eventId),
    enabled: !!eventId,
    queryFn: async (): Promise<TicketTier[]> => {
      const { data, error } = await supabase
        .from("ticket_tiers" as any)
        .select("*")
        .eq("event_id", eventId!)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as TicketTier[]) || [];
    },
    staleTime: 30_000,
  });
};

/**
 * Compute the buyer-visible state of each tier.
 *  - parallel mode: all tiers visible at once.
 *  - sequential mode: a tier with `unlock_after_tier_id` is hidden until that tier is sold out.
 */
export const computeTierAvailability = (tiers: TicketTier[], now: Date = new Date()) => {
  const byId = new Map(tiers.map((t) => [t.id, t]));
  return tiers.map((t) => {
    const soldOut = t.capacity != null && t.sold_count >= t.capacity;
    const remaining = t.capacity != null ? Math.max(t.capacity - t.sold_count, 0) : null;
    const endsAt = t.sales_end_at ? new Date(t.sales_end_at) : null;
    const closed = !!endsAt && !isNaN(endsAt.getTime()) && endsAt.getTime() <= now.getTime();
    let unlocked = true;
    if (t.unlock_after_tier_id) {
      const parent = byId.get(t.unlock_after_tier_id);
      unlocked = !!parent && parent.capacity != null && parent.sold_count >= parent.capacity;
    }
    return { tier: t, soldOut, remaining, unlocked, closed, endsAt: closed ? endsAt : endsAt };
  });
};

/** "hasta el 5 sep, 22:00" style label for a tier sales deadline. */
export const formatSalesEnd = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("es-BO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};


export const useReplaceTicketTiers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      tiers,
      sequential,
    }: {
      eventId: string;
      tiers: TicketTierInput[];
      sequential: boolean;
    }) => {
      // Wipe & re-insert (simple, robust). Existing FKs on guestlist_entries / payment_sessions
      // SET NULL on delete, so historical records are safe.
      const { error: delErr } = await supabase
        .from("ticket_tiers" as any)
        .delete()
        .eq("event_id", eventId);
      if (delErr) throw delErr;

      if (tiers.length === 0) return [];

      // Insert in order so we can chain unlock_after_tier_id for sequential mode.
      const created: TicketTier[] = [];
      let prevId: string | null = null;
      const sorted = [...tiers].sort((a, b) => a.display_order - b.display_order);
      for (const t of sorted) {
        const row = {
          event_id: eventId,
          name: t.name,
          description: t.description ?? null,
          price: t.price,
          capacity: t.capacity ?? null,
          display_order: t.display_order,
          unlock_after_tier_id: sequential ? prevId : null,
          sales_end_at: t.sales_end_at ?? null,
        };

        const { data, error } = await supabase
          .from("ticket_tiers" as any)
          .insert(row)
          .select("*")
          .single();
        if (error) throw error;
        const inserted = data as unknown as TicketTier;
        created.push(inserted);
        prevId = inserted.id;
      }
      return created;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: TIERS_KEY(vars.eventId) });
    },
  });
};
