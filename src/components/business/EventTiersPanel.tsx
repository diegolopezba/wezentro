import { Skeleton } from "@/components/ui/skeleton";
import { useEventEntryBreakdown, type EntryCategory } from "@/hooks/usePromoters";
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

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex-1 rounded-xl bg-secondary/60 px-2 py-2 text-center">
    <p className="text-base font-semibold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export const EventTiersPanel = ({ eventId }: { eventId: string }) => {
  const { data, isLoading } = useEventEntryBreakdown(eventId);

  if (isLoading) {
    return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  const cats = data?.categories || [];
  const inv = data?.invites || { sent: 0, accepted: 0, pending: 0, revoked: 0, checked_in: 0 };
  const sum = (kinds: string[]) => cats.filter((c) => kinds.includes(c.kind)).reduce((a, c) => a + c.count, 0);
  const paid = sum(["tier", "single", "lounge"]);
  const gate = sum(["gate"]);
  const guests = sum(["special", "manual"]);
  const total = paid + gate + guests;
  const sold = cats.filter((c) => !["special", "manual"].includes(c.kind));
  const guestCats = cats.filter((c) => ["special", "manual"].includes(c.kind));

  const Row = ({ c }: { c: EntryCategory }) => {
    const o = occupancy(c.count, c.capacity);
    return (
      <div className="rounded-2xl bg-card border border-border p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
              {o.label && <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", o.chip)}>{o.label}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {c.price != null ? `${formatBs(c.price)} · ` : ""}
              {c.count}{c.capacity ? ` / ${c.capacity}` : ""} {c.revenue > 0 || c.kind !== "manual" ? "vendidas" : "entradas"} · {c.checked_in} ingresaron
            </p>
          </div>
          {c.revenue > 0 && <p className="text-sm font-semibold text-foreground">{formatBs(c.revenue)}</p>}
        </div>
        {o.pct !== null && <OccupancyBar pct={o.pct} bar={o.bar} />}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-[11px] text-muted-foreground">Total de entradas emitidas</p>
        <p className="text-3xl font-semibold text-foreground">{total}</p>
        <div className="flex gap-2 mt-3">
          <Stat label="Pagadas" value={paid} />
          <Stat label="En puerta" value={gate} />
          <Stat label="Invitados" value={guests} />
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendidas por categoría</h3>
        {sold.length ? sold.map((c) => <Row key={c.kind + c.key} c={c} />) : (
          <p className="text-sm text-muted-foreground text-center py-4">Todavía no hay entradas vendidas.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invitados</h3>
        <div className="rounded-2xl bg-card border border-border p-3">
          <p className="text-sm font-semibold text-foreground">Invitaciones especiales</p>
          <div className="flex gap-2 mt-2">
            <Stat label="Enviadas" value={inv.sent} />
            <Stat label="Aceptadas" value={inv.accepted} />
            <Stat label="Pendientes" value={inv.pending} />
            <Stat label="Revocadas" value={inv.revoked} />
          </div>
        </div>
        {guestCats.map((c) => <Row key={c.kind} c={c} />)}
      </section>
    </div>
  );
};
