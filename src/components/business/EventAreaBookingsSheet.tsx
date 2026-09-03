import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Loader2, Armchair } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import {
  useEventAreaBookings,
  useEventAreaBookingsRealtime,
  useSetAreaBookingStatus,
  useCancelAreaBookingAsBusiness,
  useEventAreas,
  type EventAreaBooking,
} from "@/hooks/useVenueLayouts";
import { useEventPurchaseQuestions } from "@/hooks/useEventPurchaseQuestions";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmada", cls: "bg-emerald-500/15 text-emerald-600" },
  checked_in: { label: "Check-in", cls: "bg-blue-500/15 text-blue-600" },
  cancelled: { label: "Cancelada", cls: "bg-red-500/15 text-red-600" },
  no_show: { label: "No-show", cls: "bg-amber-500/15 text-amber-600" },
  held: { label: "Pendiente", cls: "bg-slate-500/15 text-slate-600" },
};

type Filter = "active" | "all" | "checked_in" | "cancelled" | "no_show";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "active", label: "Activas" },
  { key: "all", label: "Todas" },
  { key: "checked_in", label: "Check-in" },
  { key: "cancelled", label: "Canceladas" },
  { key: "no_show", label: "No-shows" },
];

interface Props {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventAreaBookingsSheet({ eventId, eventTitle, open, onOpenChange }: Props) {
  const { data: bookings = [], isLoading } = useEventAreaBookings(eventId);
  const { data: areas = [] } = useEventAreas(eventId);
  useEventAreaBookingsRealtime(open ? eventId : undefined);
  const { data: questions = [] } = useEventPurchaseQuestions(open ? eventId : undefined);
  const questionLabels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const q of questions) m[q.id] = q.label;
    return m;
  }, [questions]);

  const setStatus = useSetAreaBookingStatus();
  const cancelBooking = useCancelAreaBookingAsBusiness();

  const [filter, setFilter] = useState<Filter>("active");
  const [cancelTarget, setCancelTarget] = useState<EventAreaBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return bookings.filter((b) => b.status === "confirmed");
      case "checked_in":
        return bookings.filter((b) => b.status === "checked_in");
      case "cancelled":
        return bookings.filter((b) => b.status === "cancelled");
      case "no_show":
        return bookings.filter((b) => b.status === "no_show");
      default:
        return bookings.filter((b) => b.status !== "held");
    }
  }, [bookings, filter]);

  const confirmedCount = bookings.filter((b) =>
    ["confirmed", "checked_in"].includes(b.status),
  ).length;
  const totalCapacity = areas.reduce((sum, a) => sum + (a.capacity ?? 0), 0);

  const handleAction = async (bookingId: string, status: "checked_in" | "no_show") => {
    haptic("light");
    try {
      await setStatus.mutateAsync({ bookingId, status });
      toast.success(status === "checked_in" ? "Check-in registrado" : "Marcada como no-show");
    } catch (e: any) {
      toast.error(e.message || "No se pudo actualizar la reserva");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    haptic("medium");
    try {
      await cancelBooking.mutateAsync({
        bookingId: cancelTarget.id,
        reason: cancelReason.trim(),
      });
      toast.success("Reserva cancelada");
      setCancelTarget(null);
      setCancelReason("");
    } catch (e: any) {
      toast.error(e.message || "No se pudo cancelar la reserva");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="light-sheet rounded-t-3xl border-border bg-background max-h-[92dvh] overflow-y-auto pb-8"
        >
          <SheetTitle className="sr-only">Reservas de lounge</SheetTitle>
          <SheetDescription className="sr-only">
            Reservas de áreas de este evento.
          </SheetDescription>

          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reservas de lounge
            </p>
            <h2 className="font-brand text-xl font-medium text-foreground leading-tight line-clamp-2">
              {eventTitle}
            </h2>
            {totalCapacity > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {confirmedCount} reservas · capacidad de áreas {totalCapacity} personas
              </p>
            )}
          </div>

          <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border shrink-0",
                  filter === f.key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary/50 border-border text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="px-5 space-y-2">
            {isLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Armchair className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {filter === "active"
                    ? "Todavía no hay reservas de áreas."
                    : "No hay reservas con este estado."}
                </p>
              </div>
            ) : (
              filtered.map((b) => {
                const st = STATUS_STYLES[b.status] ?? STATUS_STYLES.confirmed;
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-card border border-border p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={b.buyer_avatar_url ?? undefined} />
                        <AvatarFallback>
                          <img src={DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {b.buyer_full_name || b.buyer_username || "Invitado"}
                          </p>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                              st.cls,
                            )}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {b.area_name} · {b.party_size}{" "}
                          {b.party_size === 1 ? "persona" : "personas"}
                          {b.included_tickets > 0 &&
                            ` · incluye ${b.included_tickets} ent.`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(b.created_at), "d MMM · HH:mm", { locale: es })}
                          {b.amount != null && ` · Bs. ${b.amount}`}
                          {b.payment_method === "card"
                            ? " · Tarjeta"
                            : b.payment_method === "qr"
                              ? " · QR"
                              : ""}
                        </p>
                        {b.status === "cancelled" && b.cancellation_reason && (
                          <p className="text-[11px] text-muted-foreground italic">
                            “{b.cancellation_reason}”
                          </p>
                        )}
                      </div>
                    </div>

                    {b.answers && Object.keys(b.answers).length > 0 && (
                      <div className="rounded-xl bg-secondary/50 p-2.5 space-y-1">
                        {Object.entries(b.answers).map(([qid, value]) => (
                          <div key={qid} className="text-[11px] leading-snug">
                            <span className="text-muted-foreground">
                              {questionLabels[qid] ?? "Respuesta"}:{" "}
                            </span>
                            <span className="text-foreground font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(b.status === "confirmed" || b.status === "checked_in") && (
                      <div className="flex gap-2">
                        {b.status === "confirmed" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="sheet-action"
                            className="flex-1 h-9 rounded-full text-xs"
                            disabled={setStatus.isPending}
                            onClick={() => handleAction(b.id, "checked_in")}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Check-in
                          </Button>
                        )}
                        {b.status === "confirmed" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-full text-xs"
                            disabled={setStatus.isPending}
                            onClick={() => handleAction(b.id, "no_show")}
                          >
                            No-show
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-full text-xs text-destructive"
                          onClick={() => {
                            setCancelReason("");
                            setCancelTarget(b);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancelación por el negocio: motivo requerido por el flujo */}
      <Sheet open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-8">
          <SheetTitle className="sr-only">Cancelar reserva</SheetTitle>
          <SheetDescription className="sr-only">
            Cancelá esta reserva de lounge.
          </SheetDescription>
          {cancelTarget && (
            <div className="pt-2 space-y-4">
              <div>
                <p className="font-brand text-lg font-medium text-foreground">
                  Cancelar reserva
                </p>
                <p className="text-xs text-muted-foreground">
                  {cancelTarget.area_name} ·{" "}
                  {cancelTarget.buyer_full_name || cancelTarget.buyer_username} · se libera
                  el área de inmediato
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Motivo</label>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. duplicado, pedido del cliente…"
                />
              </div>
              <Button
                type="button"
                variant="sheet-action"
                className="w-full h-12 rounded-full"
                disabled={cancelBooking.isPending}
                onClick={handleCancel}
              >
                {cancelBooking.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Confirmar cancelación
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
