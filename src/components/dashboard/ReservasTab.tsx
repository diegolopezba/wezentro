import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Users, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "./StatsCard";
import { PeriodSelector, Period } from "./PeriodSelector";
import { ReservationsSummary } from "./ReservationsSummary";

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

interface ReservasTabProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
}

export const ReservasTab = ({ period, onPeriodChange }: ReservasTabProps) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["reservations-analytics", user?.id, period],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("reservations")
        .select("id, reservation_date, reservation_time, party_size, status")
        .eq("business_id", user!.id);

      if (period !== "all") {
        const days = period === "7d" ? 7 : 30;
        q = q.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const rows = data || [];
    const total = rows.length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    const active = rows.filter((r) => r.status !== "cancelled");
    const guests = active.reduce((s, r) => s + Number(r.party_size || 0), 0);

    const byDay: Record<number, { count: number; guests: number }> = {};
    active.forEach((r) => {
      const d = new Date(`${r.reservation_date}T00:00:00`).getDay();
      const b = (byDay[d] ||= { count: 0, guests: 0 });
      b.count += 1;
      b.guests += Number(r.party_size || 0);
    });

    return {
      total,
      guests,
      cancelRate: total ? (cancelled / total) * 100 : 0,
      byDay,
      enoughForBreakdown: total >= 20,
    };
  }, [data]);

  const maxDay = Math.max(1, ...Object.values(stats.byDay).map((b) => b.count));

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="font-brand text-lg font-semibold text-foreground">Reservas</h2>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {isLoading ? (
        <Skeleton className="h-28 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <StatsCard title="Reservas" value={stats.total} icon={CalendarCheck} delay={0} />
          <StatsCard title="Invitados" value={stats.guests} icon={Users} delay={0.05} />
          <StatsCard
            title="Cancelación"
            value={`${stats.cancelRate.toFixed(0)}%`}
            icon={XCircle}
            delay={0.1}
          />
        </div>
      )}

      {stats.enoughForBreakdown && (
        <section className="rounded-2xl bg-card border border-border p-4">
          <h3 className="font-brand text-sm font-semibold text-foreground mb-3">
            Días que más se llenan
          </h3>
          <div className="space-y-2">
            {DAYS_ES.map((label, i) => {
              const b = stats.byDay[i] || { count: 0, guests: 0 };
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-8 text-[11px] text-muted-foreground">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(b.count / maxDay) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-[11px] text-muted-foreground">
                    {b.count} · {b.guests} pax
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-brand text-sm font-semibold text-foreground">Próximas reservas</h3>
        <ReservationsSummary />
      </section>
    </div>
  );
};
