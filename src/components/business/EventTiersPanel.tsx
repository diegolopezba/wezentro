import { Skeleton } from "@/components/ui/skeleton";
import { useEventEntryBreakdown, type EntryCategory, type EntryBreakdown } from "@/hooks/usePromoters";
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

export const entryTotals = (data: EntryBreakdown) => {
  const count = (kinds: EntryCategory["kind"][]) => data.categories
    .filter((category) => kinds.includes(category.kind))
    .reduce((sum, category) => sum + Number(category.count), 0);
  const sold = count(["tier", "single", "gate", "lounge"]);
  const invited = count(["special"]);
  const manual = count(["manual"]);
  return { sold, invited, manual, total: sold + invited + manual };
};

const Row = ({ c, guest = false }: { c: EntryCategory; guest?: boolean }) => {
  const o = occupancy(c.count, c.capacity);
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{c.name}</p>
            {o.label && <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", o.chip)}>{o.label}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {c.price != null && !guest ? `${formatBs(c.price)} · ` : ""}
            {c.count}{c.capacity != null ? ` / ${c.capacity}` : ""} {guest ? "entradas" : "vendidas"}
            {c.checked_in > 0 ? ` · ${c.checked_in} ingresaron` : ""}
          </p>
        </div>
        {!guest && <p className="text-sm font-semibold text-foreground whitespace-nowrap">{formatBs(c.revenue)}</p>}
      </div>
      {o.pct !== null && <OccupancyBar pct={o.pct} bar={o.bar} />}
    </div>
  );
};

export const EventTiersPanel = ({ eventId }: { eventId: string }) => {
  const { data, isLoading, isError } = useEventEntryBreakdown(eventId);

  if (isLoading) {
    return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  if (isError || !data) return <p role="alert" className="text-sm text-destructive py-4">No pudimos cargar las entradas. Volvé a intentar más tarde.</p>;

  const { sold, invited, manual, total } = entryTotals(data);
  const normal = data.categories.filter((c) => c.kind === "tier" || c.kind === "single");
  const gate = data.categories.filter((c) => c.kind === "gate");
  const lounge = data.categories.filter((c) => c.kind === "lounge");
  const guestCats = data.categories.filter((c) => (c.kind === "special" || c.kind === "manual") && c.count > 0);
  const inviteDifference = data.invites.accepted - invited;

  return (
    <div className="space-y-4">
      <div className="border-y border-border py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span><strong className="text-foreground">{sold}</strong> {sold === 1 ? "entrada vendida" : "entradas vendidas"} <span aria-hidden="true">+</span> <strong className="text-foreground">{data.invites.accepted}</strong> invitaciones aceptadas{manual > 0 && <> <span aria-hidden="true">+</span> <strong className="text-foreground">{manual}</strong> cortesías</>}</span>
          <span className="font-semibold text-foreground">= {total} asistentes</span>
        </div>
        {inviteDifference > 0 && <p className="mt-1">{inviteDifference} invitaciones aceptadas no generaron una entrada adicional.</p>}
        {inviteDifference < 0 && <p className="mt-1">{Math.abs(inviteDifference)} entradas de invitación no corresponden a una aceptación registrada.</p>}
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendidas por categoría</h3>
        {normal.length ? normal.map((c) => <Row key={c.kind + c.key} c={c} />) : <p className="text-sm text-muted-foreground py-3">Todavía no hay categorías de entradas.</p>}
      </section>

      {gate.length > 0 && <section className="space-y-2"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ventas en puerta</h3>{gate.map((c) => <Row key={c.kind + c.key} c={c} />)}</section>}
      {lounge.length > 0 && <section className="space-y-2"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lounges</h3>{lounge.map((c) => <Row key={c.kind + c.key} c={c} />)}</section>}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invitados</h3>
        <div className="border-t border-border pt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{data.invites.sent}</strong> enviadas</span>
          <span><strong className="text-foreground">{data.invites.accepted}</strong> aceptadas</span>
          <span>{data.invites.pending} pendientes</span>
          <span>{data.invites.revoked} revocadas</span>
        </div>
        {guestCats.map((c) => <Row key={c.kind} c={c} guest />)}
      </section>
    </div>
  );
};
