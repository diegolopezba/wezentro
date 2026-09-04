import { useState } from "react";
import { CalendarCheck, Users, XCircle, Lock, UserX, Clock, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatsCard } from "./StatsCard";
import { PeriodSelector, Period } from "./PeriodSelector";
import { ReservationHeatmap } from "./reservations/ReservationHeatmap";
import { OccupancyCard } from "./reservations/OccupancyCard";
import { CancellationsCard } from "./reservations/CancellationsCard";
import { WaitlistDemandCard } from "./reservations/WaitlistDemandCard";
import { RepeatGuestsCard } from "./reservations/RepeatGuestsCard";
import { ServicePaceCard } from "./reservations/ServicePaceCard";
import { useReservationAnalytics } from "@/hooks/useReservationAnalytics";

import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PlansSheet } from "@/components/subscriptions/PlansSheet";
import { featureUpgradeLabel } from "@/lib/subscriptionTiers";

interface ReservasTabProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
}

const trendFrom = (current: number, previous: number | undefined) => {
  if (previous === undefined || previous <= 0) return undefined;
  const change = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(change), isPositive: change >= 0 };
};

const formatLead = (hours: number) => {
  if (!hours || hours <= 0) return "—";
  if (hours >= 48) return `${Math.round(hours / 24)} d`;
  return `${Math.round(hours)} h`;
};

export const ReservasTab = ({ period, onPeriodChange }: ReservasTabProps) => {
  const { user } = useAuth();
  const { tier, hasFeature } = useSubscriptionTier(user?.id);
  const fullAnalytics = hasFeature("reservas_analytics_full");
  const [plansOpen, setPlansOpen] = useState(false);

  const { data, isLoading } = useReservationAnalytics(period);

  const cur = data?.current;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="font-brand text-lg font-semibold text-foreground">Reservas</h2>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </div>

      {isLoading || !cur ? (
        <Skeleton className="h-28 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatsCard
            title="Reservas"
            value={cur.total}
            icon={CalendarCheck}
            trend={trendFrom(cur.total, data?.previous?.total)}
            delay={0}
          />
          <StatsCard
            title="Covers"
            value={cur.covers}
            icon={Users}
            trend={trendFrom(cur.covers, data?.previous?.covers)}
            delay={0.05}
          />
          <StatsCard
            title="Grupo promedio"
            value={cur.avg_party || 0}
            icon={Users2}
            description="personas por reserva"
            delay={0.1}
          />
          {fullAnalytics && (
            <>
              <StatsCard
                title="Cancelación"
                value={cur.cancel_rate !== null ? `${cur.cancel_rate}%` : "—"}
                icon={XCircle}
                delay={0.15}
              />
              <StatsCard
                title="No-shows"
                value={cur.no_shows}
                icon={UserX}
                description={cur.no_show_rate !== null ? `${cur.no_show_rate}% del total` : undefined}
                delay={0.2}
              />
              <StatsCard
                title="Anticipación"
                value={formatLead(cur.lead_hours)}
                icon={Clock}
                description="antes de la reserva"
                delay={0.25}
              />
            </>
          )}
        </div>
      )}

      {!fullAnalytics && (
        <section className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-brand text-sm font-semibold text-foreground">
              Analíticas completas de reservas
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Mapa de calor por día y hora, ocupación vs. capacidad, no-shows, demanda en
            lista de espera y tus clientes que más vuelven.{" "}
            {featureUpgradeLabel("reservas_analytics_full")}.
          </p>
          <Button
            variant="default"
            className="w-full rounded-full mt-1"
            onClick={() => setPlansOpen(true)}
          >
            Ver planes
          </Button>
        </section>
      )}

      {fullAnalytics && data && !isLoading && (
        <>
          <ReservationHeatmap heatmap={data.heatmap} />
          <OccupancyCard data={data} />
          <CancellationsCard data={data} />
          <WaitlistDemandCard waitlist={data.waitlist} />
          <RepeatGuestsCard guests={data.guests} />
          <ServicePaceCard service={data.service} turnTime={data.capacity.turn_time} />
        </>
      )}

      <PlansSheet open={plansOpen} onOpenChange={setPlansOpen} currentTier={tier} />
    </div>
  );
};
