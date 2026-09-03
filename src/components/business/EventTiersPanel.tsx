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
    return <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  if (!tiers?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Este evento no tiene tipos de entrada configurados.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tiers.map((t) => {
        const cap = t.capacity ?? null;
        const o = occupancy(t.sold, cap);
        return (
          <div key={t.tier_id} className="rounded-2xl bg-card border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  {o.label && (
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", o.chip)}>
                      {o.label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatBs(t.price)} · {t.sold}{cap ? ` / ${cap}` : ""} vendidas
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatBs(t.revenue_bs)}</p>
            </div>
            {o.pct !== null && <OccupancyBar pct={o.pct} bar={o.bar} />}
          </div>
        );
      })}
    </div>
  );
};
