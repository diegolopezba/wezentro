import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SlotStatus = "available" | "limited" | "full";

export interface SlotInfo {
  time: string; // "HH:MM"
  booked: number;
  capacity: number | null;
  status: SlotStatus;
}

/**
 * Fetches all confirmed reservations for a business on a given date,
 * and bins them by reservation_time. Returns a map keyed by "HH:MM".
 *
 * Status rules:
 * - capacity is null  → always "available" (no cap configured)
 * - booked >= capacity → "full"
 * - booked / capacity >= 0.8 → "limited"
 * - otherwise → "available"
 */
export const useSlotAvailability = (
  businessId: string | undefined,
  date: string | undefined,
  excludeReservationId?: string
) => {
  return useQuery({
    queryKey: ["slot-availability", businessId, date, excludeReservationId ?? null],
    queryFn: async (): Promise<{ capacity: number | null; bookings: Map<string, number> }> => {
      if (!businessId || !date) return { capacity: null, bookings: new Map() };

      const [profileRes, reservationsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("reservation_capacity")
          .eq("id", businessId)
          .single(),
        supabase
          .from("reservations")
          .select("id, reservation_time, party_size")
          .eq("business_id", businessId)
          .eq("reservation_date", date)
          .eq("status", "confirmed"),
      ]);

      const capacity = profileRes.data?.reservation_capacity ?? null;
      const bookings = new Map<string, number>();

      (reservationsRes.data || []).forEach((r: any) => {
        if (excludeReservationId && r.id === excludeReservationId) return;
        const key = String(r.reservation_time).slice(0, 5); // "HH:MM"
        bookings.set(key, (bookings.get(key) ?? 0) + Number(r.party_size || 0));
      });

      return { capacity, bookings };
    },
    enabled: !!businessId && !!date,
    staleTime: 30_000,
  });
};

export const computeSlotInfo = (
  time: string,
  bookings: Map<string, number>,
  capacity: number | null,
  partySize = 1
): SlotInfo => {
  const booked = bookings.get(time) ?? 0;
  if (capacity == null) {
    return { time, booked, capacity: null, status: "available" };
  }
  const projected = booked + partySize;
  if (projected > capacity) return { time, booked, capacity, status: "full" };
  const ratio = booked / capacity;
  if (ratio >= 0.8) return { time, booked, capacity, status: "limited" };
  return { time, booked, capacity, status: "available" };
};

/** Group "HH:MM" times into meal periods. */
export const groupSlotsByPeriod = (slots: string[]) => {
  const lunch: string[] = [];
  const dinner: string[] = [];
  const other: string[] = [];
  for (const s of slots) {
    const h = parseInt(s.slice(0, 2), 10);
    if (h >= 12 && h < 16) lunch.push(s);
    else if (h >= 19 && h < 24) dinner.push(s);
    else other.push(s);
  }
  return { lunch, dinner, other };
};

/** Find up to N nearest non-full alternatives around a target time. */
export const findAlternatives = (
  target: string,
  slots: string[],
  bookings: Map<string, number>,
  capacity: number | null,
  partySize: number,
  count = 3
): string[] => {
  const toMinutes = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
  const targetMin = toMinutes(target);
  const ranked = slots
    .filter((s) => s !== target)
    .map((s) => ({ s, info: computeSlotInfo(s, bookings, capacity, partySize) }))
    .filter((x) => x.info.status !== "full")
    .map((x) => ({ ...x, dist: Math.abs(toMinutes(x.s) - targetMin) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((x) => x.s);
  return ranked;
};
