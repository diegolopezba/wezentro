import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { m } from "framer-motion";
import { CalendarCheck, Users } from "lucide-react";
import { format } from "date-fns";

export const useReservationStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-reservation-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const today = new Date().toISOString().split("T")[0];

      const { data: upcoming, error } = await supabase
        .from("reservations")
        .select("id, reservation_date, reservation_time, party_size, status, user_id, profiles:user_id(username, full_name)")
        .eq("business_id", user.id)
        .eq("status", "confirmed")
        .gte("reservation_date", today)
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true })
        .limit(5);

      if (error) throw error;

      const totalGuests = (upcoming || []).reduce((sum, r) => sum + r.party_size, 0);

      return {
        upcomingCount: upcoming?.length || 0,
        totalGuests,
        upcoming: upcoming || [],
      };
    },
    enabled: !!user?.id,
  });
};

export const ReservationsSummary = () => {
  const { data, isLoading } = useReservationStats();

  if (isLoading) {
    return <div className="h-32 bg-secondary/50 rounded-xl animate-pulse" />;
  }

  if (!data || data.upcomingCount === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 text-center">
        <CalendarCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sin reservas próximas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-3 rounded-xl bg-primary/10 border border-primary/20"
        >
          <p className="text-2xl font-bold text-foreground">{data.upcomingCount}</p>
          <p className="text-xs text-muted-foreground">Próximas</p>
        </m.div>
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 p-3 rounded-xl bg-primary/10 border border-primary/20"
        >
          <p className="text-2xl font-bold text-foreground">{data.totalGuests}</p>
          <p className="text-xs text-muted-foreground">Personas esperadas</p>
        </m.div>
      </div>

      <div className="space-y-2">
        {data.upcoming.map((res: any) => (
          <m.div
            key={res.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {(res.profiles as any)?.username || "usuario"}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(res.reservation_date + "T00:00:00"), "dd MMM")} · {res.reservation_time.slice(0, 5)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {res.party_size}
            </div>
          </m.div>
        ))}
      </div>
    </div>
  );
};
