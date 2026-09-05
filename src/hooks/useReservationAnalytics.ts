import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Period } from "@/components/dashboard/PeriodSelector";

export interface ReservationAnalytics {
  range: {
    from: string | null;
    to: string | null;
    data_from?: string | null;
    data_to?: string | null;
  };
  current: {
    total: number;
    cancelled: number;
    no_shows: number;
    covers: number;
    avg_party: number;
    cancel_rate: number | null;
    no_show_rate: number | null;
    lead_hours: number;
  };
  previous: { total: number; covers: number } | null;
  heatmap: { dow: number; hour: number; count: number; covers: number }[];
  cancellations: {
    by_actor: Record<string, number>;
    by_hour: { hour: number; count: number }[];
    lost_covers: number;
  };
  waitlist: {
    total: number;
    people: number;
    converted: number;
    notified: number;
    top_slots: { dow: number; hour: number; count: number }[];
  };
  guests: {
    unique_guests: number;
    repeat_guests: number;
    repeat_rate: number | null;
    top: {
      user_id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      reservations: number;
      covers: number;
    }[];
  };
  service: {
    avg_seat_delay_min: number;
    avg_table_minutes: number;
    seated_count: number;
  };
  capacity: {
    active_seats: number;
    table_count: number;
    turn_time: number;
    max_covers_per_interval: number | null;
    shifts: { weekday: number; shift_name: string | null; minutes: number }[];
  };
}

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export const useReservationAnalytics = (period: Period) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reservation-analytics", user?.id, period],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<ReservationAnalytics> => {
      let from: string | null = null;
      let to: string | null = null;

      if (period !== "all") {
        const days = period === "7d" ? 7 : 30;
        from = toISODate(new Date(Date.now() - days * 86400000));
        to = toISODate(new Date(Date.now() + days * 86400000));
      }

      const { data, error } = await supabase.rpc(
        "get_business_reservation_analytics",
        { _business_id: user!.id, _from: from, _to: to }
      );
      if (error) throw error;
      return data as unknown as ReservationAnalytics;
    },
  });
};
