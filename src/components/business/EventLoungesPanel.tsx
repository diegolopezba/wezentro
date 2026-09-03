import { useMemo, useState } from "react";
import { ChevronDown, Armchair } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  useEventAreas,
  useEventAreaBookings,
  useEventAreaBookingsRealtime,
} from "@/hooks/useVenueLayouts";
import { formatBs } from "@/components/sales/salesUtils";
import { occupancy, OccupancyBar } from "./EventTiersPanel";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmada", cls: "bg-emerald-500/15 text-emerald-600" },
  checked_in: { label: "Check-in", cls: "bg-blue-500/15 text-blue-600" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/15 text-destructive" },
  no_show: { label: "No-show", cls: "bg-amber-500/15 text-amber-600" },
  held: { label: "Pendiente", cls: "bg-slate-500/15 text-slate-600" },
};

interface Props {
  eventId: string;
  onManage: () => void;
}

export const EventLoungesPanel = ({ eventId, onManage }: Props) => {
  const { data: areas = [], isLoading } = useEventAreas(eventId);
  const { data: bookings = [] } = useEventAreaBookings(eventId);
  useEventAreaBookingsRealtime(eventId);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sellable = useMemo(() => areas.filter((a) => !a.is_decor), [areas]);

  const byArea = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    for (const b of bookings) {
      (map[b.event_area_id] ||= [] as any).push(b);
    }
    return map;
  }, [bookings]);

  if (isLoading) {
    return <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-2">
      {sellable.map((a) => {
        const rows = (byArea[a.id] || []).filter((b) =>
          ["confirmed", "checked_in"].includes(b.status),
        );
        const taken = rows.reduce((n, b) => n + (a.is_exclusive ? 1 : b.party_size), 0);
        const cap = a.is_exclusive ? 1 : a.capacity;
        const o = occupancy(taken, cap);
        const open = expanded === a.id;

        return (
          <div key={a.id} className="rounded-2xl bg-card border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => { haptic("light"); setExpanded(open ? null : a.id); }}
              className="w-full p-3 text-left active:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Armchair className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                    {o.label && (
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", o.chip)}>
                        {o.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatBs(a.price)} · {taken}/{cap} {a.is_exclusive ? "reservada" : "lugares"}
                    {rows.length > 0 ? ` · ${rows.length} reserva${rows.length === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </div>
              {o.pct !== null && <OccupancyBar pct={o.pct} bar={o.bar} />}
            </button>

            {open && (
              <div className="border-t border-border px-3 py-2 space-y-2">
                {rows.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground py-1">Sin reservas todavía.</p>
                ) : (
                  rows.map((b) => {
                    const st = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.confirmed;
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {b.buyer_full_name || b.buyer_username || "Invitado"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {b.party_size} persona{b.party_size === 1 ? "" : "s"}
                            {b.amount != null ? ` · ${formatBs(b.amount)}` : ""}
                          </p>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0", st.cls)}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })
                )}
                <Button
                  variant="secondary"
                  className="w-full rounded-full h-9 text-xs mt-1"
                  onClick={onManage}
                >
                  Gestionar reservas de lounge
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
