import { useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, Minus, Plus } from "lucide-react";
import { VenueGridCanvas, type AreaState } from "./VenueGridCanvas";
import {
  AREA_TYPE_LABELS,
  holdEventArea,
  useEventAreaAvailability,
  type AreaAvailability,
  type EventArea,
} from "@/hooks/useVenueLayouts";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  areas: EventArea[];
  /** Called once the area is atomically held for this user. */
  onAreaHeld: (args: {
    area: EventArea;
    partySize: number;
    bookingId: string;
  }) => void;
}

export function AreaPickerSheet({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  areas,
  onAreaHeld,
}: Props) {
  const { data: availability = [], isLoading, refetch } =
    useEventAreaAvailability(eventId, open);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [holding, setHolding] = useState(false);

  const availMap = useMemo(() => {
    const m: Record<string, AreaAvailability> = {};
    for (const a of availability) m[a.event_area_id] = a;
    return m;
  }, [availability]);

  const states = useMemo(() => {
    const m: Record<string, AreaState> = {};
    for (const a of areas) m[a.id] = availMap[a.id]?.state ?? "available";
    return m;
  }, [areas, availMap]);

  const selected = areas.find((a) => a.id === selectedId) || null;
  const selectedAvail = selected ? availMap[selected.id] : null;
  const remaining = selectedAvail?.remaining ?? selected?.capacity ?? 0;
  const soldOut = selected ? states[selected.id] === "unavailable" : false;
  const maxParty = selected?.is_exclusive
    ? selected.capacity
    : Math.max(1, remaining);

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    setPartySize(1);
  };

  const handleContinue = async () => {
    if (!selected) return;
    setHolding(true);
    try {
      // Re-check right before holding so we never send a stale area to checkout.
      await refetch();
      const booking = await holdEventArea(
        selected.id,
        selected.is_exclusive ? selected.capacity : partySize,
      );
      onAreaHeld({
        area: selected,
        partySize: selected.is_exclusive ? selected.capacity : partySize,
        bookingId: booking.id,
      });
    } catch (err: any) {
      toast.error(err?.message || "No se pudo reservar esta área.");
      refetch();
    } finally {
      setHolding(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl border-border bg-background p-0 max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
            aria-label="Cerrar"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Elegí tu área
          </span>
        </div>

        <div className="px-5 pb-2">
          <h2 className="text-2xl font-brand font-bold text-foreground leading-tight line-clamp-2">
            {eventTitle}
          </h2>
        </div>

        <div className="px-5">
          {isLoading ? (
            <div className="aspect-square rounded-2xl bg-secondary/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <VenueGridCanvas
              areas={areas}
              selectedId={selectedId}
              onSelect={handleSelect}
              states={states}
              renderLabel={(a) => {
                const av = availMap[a.id];
                const price = Number((a as EventArea).price ?? 0);
                const priceLabel = price > 0 ? `Bs. ${price}` : "Gratis";
                if (av?.state === "unavailable") return "Agotado";
                if (av && !av.is_exclusive) return `${priceLabel} · ${av.remaining} lug.`;
                return priceLabel;
              }}
            />
          )}
        </div>

        <div className="px-5 pt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Parcial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Agotado
          </span>
        </div>

        <div className="px-5 pt-4 pb-6">
          {selected ? (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-foreground truncate">
                    {selected.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {AREA_TYPE_LABELS[selected.area_type]} ·{" "}
                    {selected.is_exclusive
                      ? `hasta ${selected.capacity} personas`
                      : `${remaining} lugares disponibles`}
                  </p>
                </div>
                <p className="text-lg font-brand font-bold text-foreground shrink-0">
                  {Number(selected.price) > 0 ? `Bs. ${selected.price}` : "Gratis"}
                </p>
              </div>

              {!selected.is_exclusive && !soldOut && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Personas</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPartySize((v) => Math.max(1, v - 1))}
                      className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
                      aria-label="Menos"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">{partySize}</span>
                    <button
                      type="button"
                      onClick={() => setPartySize((v) => Math.min(maxParty, v + 1))}
                      className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
                      aria-label="Más"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="button"
                disabled={soldOut || holding}
                onClick={handleContinue}
                className="w-full h-13 h-14 rounded-2xl bg-foreground text-background text-base font-bold uppercase tracking-wide active:opacity-90"
              >
                {holding ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {soldOut ? "Agotado" : "Continuar"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Tocá un área del plano para ver su precio y continuar.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
