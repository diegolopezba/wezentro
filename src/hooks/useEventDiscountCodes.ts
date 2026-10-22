import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Whether the buyer could still apply a code on this event/tier. Codes stay
 * private to the organizer, so the server answers with a plain yes/no and the
 * checkout row is hidden entirely when it says no.
 */
export const useEventDiscountCodes = (eventId?: string, tierId?: string | null) =>
  useQuery({
    queryKey: ["event-discount-codes", eventId ?? null, tierId ?? null],
    enabled: !!eventId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("event_has_discount_codes", {
        _event_id: eventId ?? null,
        _tier_id: tierId ?? null,
      } as never);
      if (error) throw error;
      return Boolean(data);
    },
  }).data ?? false;
