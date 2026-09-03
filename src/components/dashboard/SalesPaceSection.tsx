import { Gauge } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesPace } from "@/hooks/useSalesOverview";

export const SalesPaceSection = () => {
  const { data, isLoading } = useSalesPace();

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;
  if (!data?.length) return null;

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-4">
      <h3 className="font-brand text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
        <Gauge className="w-4 h-4 text-primary" /> Ritmo de venta
      </h3>

      {data.map((row) => {
        const hasCapacity = row.capacity > 0;
        const pct = hasCapacity ? Math.min(100, (row.sold / row.capacity) * 100) : 0;
        return (
          <div key={row.eventId} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground truncate">{row.title}</p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {row.daysLeft === 0 ? "hoy" : `faltan ${row.daysLeft} días`}
              </p>
            </div>
            {hasCapacity && (
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {hasCapacity
                ? `${row.sold}/${row.capacity} vendidos · ${Math.round(pct)}%`
                : `${row.sold} vendidos · sin cupo definido`}
            </p>
          </div>
        );
      })}

    </section>
  );
};
