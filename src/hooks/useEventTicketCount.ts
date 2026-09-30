import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for "entradas vendidas / emitidas" on one event.
 *
 * Counts issued guestlist entries (approved + checked in), so a buyer who
 * bought 3 tickets counts as 3 — the same number the feed card, the business
 * management list and the dashboard show.
 */
export const useEventTicketCount = (eventId: string | undefined) =>
  useQuery({
    queryKey: ["event-ticket-count", eventId],
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("get_event_ticket_counts", {
        _event_ids: [eventId!],
      });
      if (error) throw error;
      const row = (data as { event_id: string; tickets: number }[] | null)?.[0];
      return Number(row?.tickets ?? 0);
    },
  });
