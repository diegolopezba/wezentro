import { m } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Building2, TrendingDown, TrendingUp, Minus, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { LockedFeature } from "@/components/subscriptions/LockedFeature";
import { CompetitiveBenchmark } from "./CompetitiveBenchmark";
import { useProfileVisits } from "@/hooks/useBusinessAnalytics";
import { Period } from "./PeriodSelector";

interface Benchmarks {
  status: "ok" | "insufficient_data";
  reason?: string;
  peer_count: number;
  city?: string;
  reservations_per_week?: { mine: number; city: number };
  avg_party_size?: { mine: number; city: number };
  cancellation_rate?: { mine: number; city: number };
  busiest_hour?: { mine: number | null; city: number | null };
  avg_event_price?: { mine: number; city: number };
}

const useCityBenchmarks = (businessId?: string, enabled = true) =>
  useQuery({
    queryKey: ["city-benchmarks", businessId],
    enabled: !!businessId && enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_city_benchmarks" as any, {
        _business_id: businessId!,
      });
      if (error) throw error;
      return data as unknown as Benchmarks;
    },
  });

const Row = ({
  label,
  mine,
  city,
  suffix = "",
  lowerIsBetter = false,
}: {
  label: string;
  mine: number;
  city: number;
  suffix?: string;
  lowerIsBetter?: boolean;
}) => {
  const diff = mine - city;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const neutral = Math.abs(diff) < 0.05;
  const Icon = neutral ? Minus : better ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border/60 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          Promedio de la ciudad: {city}
          {suffix}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-brand text-lg font-medium text-foreground">
          {mine}
          {suffix}
        </span>
        <Icon
          className={
            neutral
              ? "w-4 h-4 text-muted-foreground"
              : better
              ? "w-4 h-4 text-emerald-500"
              : "w-4 h-4 text-muted-foreground"
          }
        />
      </div>
    </div>
  );
};

const InsightsContent = ({ businessId, enabled }: { businessId?: string; enabled: boolean }) => {
  const { data, isLoading } = useCityBenchmarks(businessId, enabled);

  if (!enabled) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <p className="text-sm text-foreground">Compará tu negocio con la ciudad</p>
        <div className="space-y-2">
          {["Reservas por semana", "Tamaño promedio de grupo", "Tasa de cancelación"].map((l) => (
            <div key={l} className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{l}</span>
              <span className="font-brand text-lg font-medium text-foreground">—</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
        <div className="w-6 h-6 mx-auto border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.status !== "ok") {
    return (
      <div className="rounded-2xl bg-card border border-border p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-brand text-lg font-medium text-foreground mb-2">
          Todavía no hay suficientes datos
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {data?.reason === "missing_city_or_type"
            ? "Completá la ciudad y el tipo de negocio en tu perfil para activar las comparaciones."
            : "Necesitamos al menos 5 negocios similares en tu ciudad para mostrar promedios sin exponer datos de nadie."}
        </p>
      </div>
    );
  }

  const hour = (h: number | null | undefined) =>
    h == null ? "—" : `${String(h).padStart(2, "0")}:00`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-5">
        <p className="text-xs text-muted-foreground mb-1">
          {data.city} · comparado con {data.peer_count} negocios similares · últimos 30 días
        </p>
        <h2 className="font-brand text-lg font-medium text-foreground mb-2">
          Tu negocio vs. la ciudad
        </h2>
        <Row
          label="Reservas por semana"
          mine={data.reservations_per_week?.mine ?? 0}
          city={data.reservations_per_week?.city ?? 0}
        />
        <Row
          label="Tamaño promedio de grupo"
          mine={data.avg_party_size?.mine ?? 0}
          city={data.avg_party_size?.city ?? 0}
        />
        <Row
          label="Tasa de cancelación"
          mine={data.cancellation_rate?.mine ?? 0}
          city={data.cancellation_rate?.city ?? 0}
          suffix="%"
          lowerIsBetter
        />
        <Row
          label="Precio promedio de entrada"
          mine={data.avg_event_price?.mine ?? 0}
          city={data.avg_event_price?.city ?? 0}
          suffix=" Bs."
        />
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="font-brand text-base font-medium text-foreground mb-3">
          Horario que más se llena
        </h3>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Tu negocio</p>
            <p className="font-brand text-xl font-medium text-foreground">
              {hour(data.busiest_hour?.mine)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">La ciudad</p>
            <p className="font-brand text-xl font-medium text-foreground">
              {hour(data.busiest_hour?.city)}
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Todos los promedios son agregados y anónimos. Nunca mostramos datos de un negocio puntual.
      </p>
    </div>
  );
};

export const CityInsightsTab = ({ period = "7d" }: { period?: Period }) => {
  const { profile } = useAuth();
  const { hasFeature, tier, isLoading } = useSubscriptionTier(profile?.id);
  const unlocked = !isLoading && hasFeature("city_insights");
  const { data: profileVisits } = useProfileVisits(period);

  return (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <LockedFeature feature="city_insights" currentTier={tier} locked={!unlocked}>
        <div className="space-y-4">
          <InsightsContent businessId={profile?.id} enabled={unlocked} />

          <div className="rounded-2xl bg-card border border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Acciones en Perfil</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Visitas al perfil
              </span>
              <span className="text-sm font-semibold text-foreground">
                {unlocked ? profileVisits?.count || 0 : "—"}
              </span>
            </div>
          </div>

          <CompetitiveBenchmark />
        </div>
      </LockedFeature>
    </m.div>
  );
};

