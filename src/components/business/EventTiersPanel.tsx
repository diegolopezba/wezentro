import { Skeleton } from "@/components/ui/skeleton";
import { useTicketBreakdown } from "@/hooks/usePromoters";
import { formatBs } from "@/components/sales/salesUtils";
import { cn } from "@/lib/utils";

/** Occupancy colour scale shared by tiers and lounges. */
export const occupancy = (sold: number, capacity: number | null) => {
  if (!capacity || capacity <= 0) return { pct: null as number | null, bar: "bg-primary", label: null as string | null, chip: "" };
  const pct = Math.min(100, Math.round((sold / capacity) * 100));
  if (pct >= 100)
    return { pct, bar: "bg-destructive", label: "Agotado", chip: "bg-destructive/15 text-destructive" };
  if (pct >= 85)
    return { pct, bar: "bg-amber-500", label: "Casi agotado", chip: "bg-amber-500/15 text-amber-600" };
  return { pct, bar: "bg-primary", label: null, chip: "" };
};

export const OccupancyBar = ({ pct, bar }: { pct: number; bar: string }) => (
  <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
    <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
  </div>
);

export const EventTiersPanel = ({ eventId }: { eventId: string }) => {
  const { data: tiers, isLoading } = useTicketBreakdown(eventId);

  if (isLoading) {
    return <Skeleton className="h-40 rounded-3xl" />;
  }

  if (!tiers?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Este evento no tiene tipos de entrada configurados.
      </p>
    );
  }

  return (
    <div className="rounded-3xl bg-card border border-border/60 p-5">
      <p className="font-brand text-base font-semibold text-foreground mb-4">Por tipo de entrada</p>
      <div className="space-y-4">
        {tiers.map((t) => {
          const cap = t.capacity ?? null;
          const o = occupancy(t.sold, cap);
          return (
            <div key={t.tier_id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                <p className="text-sm text-muted-foreground flex-shrink-0">
                  {t.sold}{cap ? ` / ${cap}` : ""}
                  {o.label ? ` · ${o.label.toLowerCase()}` : ""}
                </p>
              </div>
              {o.pct !== null ? (
                <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", o.pct >= 100 ? "bg-destructive" : o.pct >= 85 ? "bg-amber-500" : "bg-foreground")}
                    style={{ width: `${o.pct}%` }}
                  />
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">{formatBs(t.price)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
