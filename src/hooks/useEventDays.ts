import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface EventDayInfo {
  day: number;
  start: string;
  /** e.g. "Vie 23" */
  short: string;
}

/** Days of a multi-day event; empty array for single-day events. */
export function useEventDays(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-days", eventId],
    queryFn: async (): Promise<EventDayInfo[]> => {
      if (!eventId) return [];
      const { data } = await supabase.from("events").select("event_days").eq("id", eventId).maybeSingle();
      const days = (data as { event_days?: unknown } | null)?.event_days;
      if (!Array.isArray(days) || days.length < 2) return [];
      return days.map((d: { start?: string }, i) => {
        const s = d?.start ? new Date(d.start) : null;
        const short = s ? format(s, "EEE d", { locale: es }).replace(/^\w/, (c) => c.toUpperCase()).replace(".", "") : "";
        return { day: i + 1, start: d?.start ?? "", short };
      });
    },
    enabled: !!eventId,
    staleTime: 5 * 60_000,
  });
}

export const inviteDayLabel = (validDay: number | null | undefined, days: EventDayInfo[]) => {
  if (days.length < 2) return null;
  if (validDay == null) return `Pase completo (${days.length} días)`;
  const d = days.find((x) => x.day === validDay);
  return `Solo Día ${validDay}${d?.short ? ` · ${d.short}` : ""}`;
};
