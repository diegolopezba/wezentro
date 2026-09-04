import { m } from "framer-motion";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  Building2,
  TrendingDown,
  TrendingUp,
  Minus,
  Eye,
  Trophy,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { LockedFeature } from "@/components/subscriptions/LockedFeature";
import { useProfileVisits } from "@/hooks/useBusinessAnalytics";
import { Button } from "@/components/ui/button";
import { Period } from "./PeriodSelector";

type MetricKey =
  | "reservations_per_week"
  | "avg_party_size"
  | "cancellation_rate"
  | "avg_event_price"
  | "reach_per_event"
  | "engagement"
  | "followers"
  | "guestlist_fill";

interface MetricValue {
  mine: number;
  city: number;
  top: number;
}

interface Benchmarks {
  status: "ok" | "insufficient_data";
  reason?: string;
  peer_count: number;
  missing_peers?: number;
  city?: string;
  business_type?: string;
  rank?: number;
  rank_total?: number;
  percentile?: number;
  metrics?: Record<MetricKey, MetricValue>;
  hours_mine?: { hour: number; mine: number }[];
  hours_city?: { hour: number; city: number }[];
}

const useCityBenchmarks = (businessId?: string, enabled = true) =>
  useQuery({
    queryKey: ["city-benchmarks-v2", businessId],
    enabled: !!businessId && enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_city_benchmarks_v2" as any, {
        _business_id: businessId!,
      });
      if (error) throw error;
      return data as unknown as Benchmarks;
    },
  });

const METRICS: {
  key: MetricKey;
  label: string;
  suffix?: string;
  prefix?: string;
  lowerIsBetter?: boolean;
  decimals?: number;
}[] = [
  { key: "reservations_per_week", label: "Reservas por semana", decimals: 1 },
  { key: "avg_party_size", label: "Tamaño promedio de grupo", decimals: 1 },
  { key: "cancellation_rate", label: "Tasa de cancelación", suffix: "%", lowerIsBetter: true, decimals: 1 },
  { key: "avg_event_price", label: "Precio promedio de entrada", prefix: "Bs. ", decimals: 0 },
  { key: "reach_per_event", label: "Alcance por evento", decimals: 1 },
  { key: "engagement", label: "Engagement", suffix: "%", decimals: 1 },
  { key: "followers", label: "Seguidores", decimals: 0 },
  { key: "guestlist_fill", label: "Ocupación de guestlist", suffix: "%", decimals: 1 },
];

const fmt = (v: number, decimals = 1, prefix = "", suffix = "") =>
  `${prefix}${Number(v ?? 0).toFixed(decimals)}${suffix}`;

const BenchmarkBar = ({
  label,
  value,
  suffix = "",
  prefix = "",
  decimals = 1,
  lowerIsBetter = false,
}: {
  label: string;
  value: MetricValue;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  lowerIsBetter?: boolean;
}) => {
  const mine = Number(value?.mine ?? 0);
  const city = Number(value?.city ?? 0);
  const top = Number(value?.top ?? 0);
  const max = Math.max(mine, city, top, 1);
  const diff = mine - city;
  const neutral = Math.abs(diff) < 0.05;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = neutral ? Minus : better ? TrendingUp : TrendingDown;
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;

  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm text-foreground">{label}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-brand text-base font-medium text-foreground">
            {fmt(mine, decimals, prefix, suffix)}
          </span>
          <Icon
            className={
              neutral
                ? "w-3.5 h-3.5 text-muted-foreground"
                : better
                ? "w-3.5 h-3.5 text-emerald-500"
                : "w-3.5 h-3.5 text-amber-500"
            }
          />
        </div>
      </div>

      <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${
            neutral ? "bg-muted-foreground/50" : better ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: pct(mine) }}
        />
        <div
          className="absolute inset-y-0 w-[2px] bg-foreground/70"
          style={{ left: pct(city) }}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 w-[2px] bg-foreground/30"
          style={{ left: pct(top) }}
          aria-hidden
        />
      </div>

      <div className="flex items-center gap-4 mt-1.5">
        <span className="text-[11px] text-muted-foreground">
          Ciudad {fmt(city, decimals, prefix, suffix)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Top 25% {fmt(top, decimals, prefix, suffix)}
        </span>
      </div>
    </div>
  );
};

const statusLabel = (percentile: number) => {
  if (percentile >= 90) return { text: "Líder de la ciudad", tone: "text-emerald-500" };
  if (percentile >= 60) return { text: "Por encima del promedio", tone: "text-emerald-500" };
  if (percentile >= 40) return { text: "En el promedio", tone: "text-muted-foreground" };
  return { text: "Con espacio para crecer", tone: "text-amber-500" };
};

const buildRecommendations = (metrics: Record<MetricKey, MetricValue>) => {
  const recs: { title: string; body: string; cta: string; to: string }[] = [];
  const m = metrics;

  if ((m.cancellation_rate?.mine ?? 0) > (m.cancellation_rate?.city ?? 0) + 1) {
    recs.push({
      title: "Tus cancelaciones están por encima de la ciudad",
      body: `Cancelás ${fmt(m.cancellation_rate.mine, 1, "", "%")} vs. ${fmt(
        m.cancellation_rate.city,
        1,
        "",
        "%",
      )} del promedio. Ajustá tus horarios y políticas de reserva para reducirlas.`,
      cta: "Ajustar reservas",
      to: "/settings/business/reservations",
    });
  }

  if ((m.reach_per_event?.mine ?? 0) < (m.reach_per_event?.city ?? 0)) {
    recs.push({
      title: "Tu alcance por evento está bajo el promedio",
      body: `Llegás a ${fmt(m.reach_per_event.mine, 1)} personas por evento; la ciudad llega a ${fmt(
        m.reach_per_event.city,
        1,
      )}. Impulsar una publicación es la forma más rápida de cerrar la brecha.`,
      cta: "Impulsar publicación",
      to: "/dashboard",
    });
  }

  if ((m.guestlist_fill?.mine ?? 0) < (m.guestlist_fill?.city ?? 0)) {
    recs.push({
      title: "Tu guestlist se llena menos que la de tus pares",
      body: `Llenás ${fmt(m.guestlist_fill.mine, 1, "", "%")} vs. ${fmt(
        m.guestlist_fill.city,
        1,
        "",
        "%",
      )}. Invitá a tu fan base y sumá promotores al próximo evento.`,
      cta: "Ver eventos",
      to: "/gestion",
    });
  }

  if ((m.avg_event_price?.mine ?? 0) > 0 && (m.avg_event_price?.mine ?? 0) < (m.avg_event_price?.city ?? 0) * 0.8) {
    recs.push({
      title: "Estás cobrando por debajo de la ciudad",
      body: `Tu entrada promedio es ${fmt(m.avg_event_price.mine, 0, "Bs. ")} y la ciudad cobra ${fmt(
        m.avg_event_price.city,
        0,
        "Bs. ",
      )}. Hay margen para subir precios o agregar un tier premium.`,
      cta: "Ver eventos",
      to: "/gestion",
    });
  }

  if ((m.avg_party_size?.mine ?? 0) > 0 && (m.avg_party_size?.mine ?? 0) < (m.avg_party_size?.city ?? 0)) {
    recs.push({
      title: "Tus grupos son más chicos que el promedio",
      body: `Recibís grupos de ${fmt(m.avg_party_size.mine, 1)} personas vs. ${fmt(
        m.avg_party_size.city,
        1,
      )} en la ciudad. Los lounges y mesas grandes suelen subir este número.`,
      cta: "Configurar planos",
      to: "/settings/business/layouts",
    });
  }

  return recs.slice(0, 3);
};

const HoursChart = ({
  mine,
  city,
}: {
  mine?: { hour: number; mine: number }[];
  city?: { hour: number; city: number }[];
}) => {
  const data = useMemo(() => {
    const map = new Map<number, { hour: string; Tú: number; Ciudad: number }>();
    (mine || []).forEach((h) =>
      map.set(h.hour, {
        hour: `${String(h.hour).padStart(2, "0")}h`,
        Tú: Number(h.mine) || 0,
        Ciudad: 0,
      }),
    );
    (city || []).forEach((h) => {
      const prev = map.get(h.hour);
      map.set(h.hour, {
        hour: `${String(h.hour).padStart(2, "0")}h`,
        Tú: prev?.Tú ?? 0,
        Ciudad: Number(h.city) || 0,
      });
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [mine, city]);

  if (!data.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay reservas suficientes para dibujar tus horarios.
      </p>
    );
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 4, top: 4 }}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar dataKey="Tú" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Ciudad" fill="hsl(var(--muted-foreground))" fillOpacity={0.45} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const InsightsContent = ({
  businessId,
  enabled,
  profileVisits,
}: {
  businessId?: string;
  enabled: boolean;
  profileVisits?: number;
}) => {
  const navigate = useNavigate();
  const { data, isLoading } = useCityBenchmarks(businessId, enabled);

  if (!enabled) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Tu posición en la ciudad</p>
          <p className="font-brand text-2xl font-medium text-foreground blur-sm select-none">
            Puesto 3 de 12
          </p>
        </div>
        <div className="space-y-3 blur-sm select-none" aria-hidden>
          {METRICS.slice(0, 4).map((mt) => (
            <div key={mt.key}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-foreground">{mt.label}</span>
                <span className="text-sm text-foreground">—</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-muted-foreground/50" />
              </div>
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

  if (!data || data.status !== "ok" || !data.metrics) {
    const missing = data?.missing_peers ?? 0;
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
            : `Necesitamos al menos 5 negocios similares en tu ciudad para mostrar promedios sin exponer datos de nadie.${
                missing > 0 ? ` Faltan ${missing}.` : ""
              }`}
        </p>
        {data?.reason === "missing_city_or_type" && (
          <Button
            variant="secondary"
            className="rounded-full mt-4"
            onClick={() => navigate("/settings/business/info")}
          >
            Completar perfil
          </Button>
        )}
      </div>
    );
  }

  const percentile = data.percentile ?? 0;
  const status = statusLabel(percentile);
  const recs = buildRecommendations(data.metrics);

  return (
    <div className="space-y-4">
      {/* Posición */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">
              {data.city} · {data.peer_count} negocios similares · últimos 30 días
            </p>
            <h2 className="font-brand text-2xl font-medium text-foreground">
              Puesto {data.rank} de {data.rank_total}
            </h2>
            <p className={`text-sm font-medium ${status.tone}`}>{status.text}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mejor que el {percentile}% de negocios similares
            </p>
          </div>
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percentile}%` }} />
        </div>

        <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" /> Visitas al perfil
          </span>
          <span className="text-sm font-semibold text-foreground">{profileVisits ?? 0}</span>
        </div>
      </div>

      {/* Comparaciones */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="font-brand text-lg font-medium text-foreground mb-1">
          Tu negocio vs. la ciudad
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          La barra es tu valor; las líneas marcan el promedio y el top 25%.
        </p>
        {METRICS.map((mt) => (
          <BenchmarkBar
            key={mt.key}
            label={mt.label}
            value={data.metrics![mt.key]}
            suffix={mt.suffix}
            prefix={mt.prefix}
            decimals={mt.decimals}
            lowerIsBetter={mt.lowerIsBetter}
          />
        ))}
      </div>

      {/* Horarios */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="font-brand text-base font-medium text-foreground mb-1">
          Horario que más se llena
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Reservas por hora: vos vs. el promedio por negocio de la ciudad.
        </p>
        <HoursChart mine={data.hours_mine} city={data.hours_city} />
      </div>

      {/* Recomendaciones */}
      {recs.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <h3 className="font-brand text-base font-medium text-foreground flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" /> Qué hacer con esto
          </h3>
          {recs.map((r) => (
            <div key={r.title} className="rounded-xl bg-secondary/60 p-4">
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.body}</p>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full mt-3"
                onClick={() => navigate(r.to)}
              >
                {r.cta}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}

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
        <InsightsContent
          businessId={profile?.id}
          enabled={unlocked}
          profileVisits={unlocked ? profileVisits?.count : undefined}
        />
      </LockedFeature>
    </m.div>
  );
};
