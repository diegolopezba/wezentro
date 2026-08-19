import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SlotStatus = "available" | "limited" | "full";

export interface SlotInfo {
  time: string; // "HH:MM"
  status: SlotStatus;
  seatsLeft: number;
}

/**
 * Server-side availability. The database function applies the business
 * schedule, closed/blackout dates, table inventory + turn time, lead time,
 * party-size limit and pacing rules, and returns one row per bookable slot.
 */
export const useReservationAvailability = (
  businessId: string | undefined,
  date: string | undefined,
  partySize: number
) => {
  return useQuery({
    queryKey: ["slot-availability", businessId, date, partySize],
    queryFn: async (): Promise<SlotInfo[]> => {
      if (!businessId || !date) return [];
      const { data, error } = await supabase.rpc("get_reservation_availability", {
        _business_id: businessId,
        _date: date,
        _party_size: partySize,
      });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        time: String(r.slot_time).slice(0, 5),
        status: r.status as SlotStatus,
        seatsLeft: Number(r.seats_left ?? 0),
      }));
    },
    enabled: !!businessId && !!date,
    staleTime: 30_000,
  });
};

/** Group "HH:MM" times into meal periods. */
export const groupSlotsByPeriod = (slots: SlotInfo[]) => {
  const lunch: SlotInfo[] = [];
  const dinner: SlotInfo[] = [];
  const other: SlotInfo[] = [];
  for (const s of slots) {
    const h = parseInt(s.time.slice(0, 2), 10);
    if (h >= 12 && h < 16) lunch.push(s);
    else if (h >= 19 && h < 24) dinner.push(s);
    else other.push(s);
  }
  return { lunch, dinner, other };
};

/** Find up to N nearest bookable alternatives around a target time. */
export const findAlternatives = (
  target: string,
  slots: SlotInfo[],
  count = 3
): string[] => {
  const toMinutes = (t: string) =>
    parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
  const targetMin = toMinutes(target);
  return slots
    .filter((s) => s.time !== target && s.status !== "full")
    .map((s) => ({ s, dist: Math.abs(toMinutes(s.time) - targetMin) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((x) => x.s.time);
};
