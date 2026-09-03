import { m } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversionFunnel } from "@/hooks/useConversionFunnel";
import type { Period } from "./PeriodSelector";

interface ConversionFunnelProps {
  period: Period;
  eventId?: string;
  title?: string;
}

const pct = (n: number, base: number) => (base > 0 ? (n / base) * 100 : null);
const fmtPct = (v: number | null) => (v === null ? "–" : `${v.toFixed(1).replace(".", ",")}%`);


export const ConversionFunnel = ({ period, eventId, title = "Embudo de conversión" }: ConversionFunnelProps) => {
  const { data, isLoading } = useConversionFunnel(period, eventId);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!data) return null;

  const base = data.impressions || data.views || data.checkoutTaps || 1;

  const stages = [
    { label: "Impresiones", value: data.impressions },
    { label: "Vistas detalle", value: data.views },
    { label: 'Tap "Comprar"', value: data.checkoutTaps },
    { label: "Checkout iniciado", value: data.checkoutStarted },
    { label: "Compras", value: data.purchases },
  ];

  const rates = [
    { label: "Vista → Comprar", value: pct(data.checkoutTaps, data.views) },
    { label: "Checkout → Compra", value: pct(data.purchases, data.checkoutStarted) },
    { label: "Conversión total", value: pct(data.purchases, data.impressions) },
  ];

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border p-4 space-y-3"
    >
      <h3 className="font-brand text-sm font-semibold text-foreground">{title}</h3>

      <div className="space-y-2.5">
        {stages.map((s) => {
          const share = pct(s.value, base) ?? 0;
          return (
            <div key={s.label} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-xs text-foreground">
                  <span className="font-semibold">{s.value.toLocaleString("es-BO")}</span>
                  <span className="text-muted-foreground ml-1.5">{fmtPct(share)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(share, s.value > 0 ? 2 : 0)}%` }} />
              </div>

            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        {rates.map((r) => (
          <div key={r.label} className="rounded-xl bg-secondary/50 p-2.5 text-center">
            <p className="font-brand text-sm font-medium text-foreground">{fmtPct(r.value)}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{r.label}</p>
          </div>
        ))}
      </div>

      {period === "all" ? (
        <p className="text-[10px] text-muted-foreground leading-tight">
          Impresiones y vistas son acumuladas desde la publicación del evento.
        </p>
      ) : data.statsSince ? (
        <p className="text-[10px] text-muted-foreground leading-tight">
          Impresiones y vistas disponibles desde el{" "}
          {new Date(`${data.statsSince}T00:00:00`).toLocaleDateString("es-BO", {
            day: "2-digit",
            month: "2-digit",
          })}
          .
        </p>
      ) : null}

    </m.section>
  );
};
