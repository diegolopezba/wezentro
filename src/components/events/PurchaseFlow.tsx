import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Loader2, Lock, Minus, Plus, Ticket, X } from "lucide-react";
import { VenueGridCanvas, type AreaState } from "@/components/venue/VenueGridCanvas";
import {
  AREA_TYPE_LABELS,
  holdEventArea,
  saveAreaBookingAnswers,
  useEventAreaAvailability,
  type AreaAvailability,
  type EventArea,
} from "@/hooks/useVenueLayouts";
import { useEventPurchaseQuestions } from "@/hooks/useEventPurchaseQuestions";
import { computeTierAvailability, type TicketTier } from "@/hooks/useTicketTiers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  areas: EventArea[];
  tiers: TicketTier[];
  sequential: boolean;
  onSelectTier: (tier: TicketTier) => void;
  onAreaHeld: (args: { area: EventArea; partySize: number; bookingId: string }) => void;
}

/**
 * Full-screen, multi-step purchase flow: pick what to buy (tiers + areas),
 * then fill in party size and the organizer's questions, then pay.
 * Replaces the old bottom sheet so long content always scrolls comfortably.
 */
export function PurchaseFlow({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  areas,
  tiers,
  sequential,
  onSelectTier,
  onAreaHeld,
}: Props) {
  const sellableAreas = useMemo(() => areas.filter((a) => !a.is_decor), [areas]);
  const hasAreas = sellableAreas.length > 0;
  const hasTiers = tiers.length > 0;

  const { data: availability = [], isLoading, refetch } = useEventAreaAvailability(
    eventId,
    open && hasAreas,
  );
  const { data: questions = [] } = useEventPurchaseQuestions(open ? eventId : undefined);

  const [step, setStep] = useState<"select" | "details">("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [holding, setHolding] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedId(null);
      setPartySize(1);
      setAnswers({});
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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

  const selected = areas.find((a) => a.id === selectedId && !a.is_decor) || null;
  const selectedAvail = selected ? availMap[selected.id] : null;
  const remaining = selectedAvail?.remaining ?? selected?.capacity ?? 0;
  const soldOut = selected ? states[selected.id] === "unavailable" : false;
  const maxParty = selected?.is_exclusive ? selected.capacity : Math.max(1, remaining);

  const tierRows = useMemo(() => {
    const rows = computeTierAvailability(tiers);
    return sequential ? rows.filter((r) => r.unlocked) : rows;
  }, [tiers, sequential]);

  const missingRequired = questions.some(
    (q) => q.required && !(answers[q.id] ?? "").toString().trim(),
  );

  const handleConfirm = async () => {
    if (!selected) return;
    if (missingRequired) {
      toast.error("Completá las preguntas obligatorias.");
      return;
    }
    setHolding(true);
    try {
      await refetch();
      const size = selected.is_exclusive ? selected.capacity : partySize;
      const booking = await holdEventArea(selected.id, size);
      if (Object.keys(answers).length > 0) {
        try {
          await saveAreaBookingAnswers(booking.id, answers);
        } catch {
          /* answers are non-blocking for the purchase */
        }
      }
      onAreaHeld({ area: selected, partySize: size, bookingId: booking.id });
    } catch (err: any) {
      toast.error(err?.message || "No se pudo reservar esta área.");
      refetch();
    } finally {
      setHolding(false);
    }
  };

  if (!open) return null;

  const header = (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center gap-2 px-4 h-14">
        <button
          type="button"
          onClick={() => (step === "details" ? setStep("select") : onOpenChange(false))}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
          aria-label={step === "details" ? "Volver" : "Cerrar"}
        >
          {step === "details" ? (
            <ChevronLeft className="w-5 h-5 text-foreground" />
          ) : (
            <X className="w-5 h-5 text-foreground" />
          )}
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {step === "details" ? "Tus datos" : "Elegí qué comprar"}
          </p>
          <p className="text-sm font-semibold text-foreground truncate">{eventTitle}</p>
        </div>
      </div>
    </div>
  );

  const selectStep = (
    <div className="pb-32">
      {hasTiers && (
        <div className="px-5 pt-5">
          {hasAreas && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Entradas
            </p>
          )}
          <div className="space-y-2">
            {tierRows.map(({ tier, soldOut: tierSoldOut, remaining: left, unlocked }) => {
              const disabled = tierSoldOut || !unlocked;
              return (
                <button
                  key={tier.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectTier(tier)}
                  className={cn(
                    "w-full text-left rounded-2xl border border-border p-4 transition-colors",
                    disabled
                      ? "opacity-50 cursor-not-allowed bg-secondary/30"
                      : "bg-secondary/50 active:bg-secondary",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        {unlocked ? (
                          <Ticket className="w-4 h-4 text-primary" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold text-foreground truncate">
                          {tier.name}
                        </div>
                        {tier.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {tier.description}
                          </div>
                        )}
                        <div className="mt-1 text-xs">
                          {tierSoldOut ? (
                            <span className="text-destructive font-medium">Agotado</span>
                          ) : left != null && left <= 10 ? (
                            <span className="text-orange-500 font-medium">Quedan {left}</span>
                          ) : (
                            <span className="text-muted-foreground">Disponible</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-base font-bold text-foreground shrink-0">
                      {Number(tier.price) > 0 ? `Bs. ${tier.price}` : "Gratis"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasAreas && (
        <div className="px-5 pt-6">
          {hasTiers && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Áreas y lounges
            </p>
          )}
          {isLoading ? (
            <div className="aspect-square rounded-2xl bg-secondary/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <VenueGridCanvas
              areas={areas}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setPartySize(1);
              }}
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

          <div className="pt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
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

          {/* Lista de áreas — alternativa clara al plano */}
          <div className="mt-4 space-y-2">
            {sellableAreas.map((a) => {
              const av = availMap[a.id];
              const out = states[a.id] === "unavailable";
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setSelectedId(a.id);
                    setPartySize(1);
                  }}
                  className={cn(
                    "w-full text-left rounded-2xl border p-4 transition-colors",
                    out
                      ? "opacity-50 cursor-not-allowed bg-secondary/30 border-border"
                      : selectedId === a.id
                        ? "border-foreground bg-secondary"
                        : "border-border bg-secondary/50 active:bg-secondary",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {AREA_TYPE_LABELS[a.area_type]} ·{" "}
                        {out
                          ? "Agotado"
                          : a.is_exclusive
                            ? `hasta ${a.capacity} personas`
                            : `${av?.remaining ?? a.capacity} lugares`}
                      </p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {a.description}
                        </p>
                      )}
                      {(a.included_tickets ?? 0) > 0 && (
                        <p className="text-xs font-semibold text-emerald-600 mt-1">
                          Incluye {a.included_tickets}{" "}
                          {a.included_tickets === 1 ? "entrada" : "entradas"}
                        </p>
                      )}
                      {(a.perks ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(a.perks ?? []).map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded-full bg-background text-[11px] font-medium border border-border"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-base font-bold text-foreground shrink-0">
                      {Number(a.price) > 0 ? `Bs. ${a.price}` : "Gratis"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const detailsStep = selected && (
    <div className="px-5 pt-5 pb-32 space-y-5">
      <div className="rounded-2xl border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {AREA_TYPE_LABELS[selected.area_type]} ·{" "}
              {selected.is_exclusive
                ? `hasta ${selected.capacity} personas`
                : `${remaining} lugares disponibles`}
            </p>
          </div>
          <p className="text-lg font-brand font-medium text-foreground shrink-0">
            {Number(selected.price) > 0 ? `Bs. ${selected.price}` : "Gratis"}
          </p>
        </div>

        {selected.description && (
          <p className="text-sm text-muted-foreground mt-3">{selected.description}</p>
        )}
        {(selected.perks ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(selected.perks ?? []).map((p) => (
              <span
                key={p}
                className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        )}
        {(selected.included_tickets ?? 0) > 0 && (
          <p className="text-sm font-semibold text-emerald-600 mt-3">
            Incluye {selected.included_tickets}{" "}
            {selected.included_tickets === 1 ? "entrada" : "entradas"} al evento
          </p>
        )}
      </div>

      {!selected.is_exclusive && !soldOut && (
        <div className="flex items-center justify-between rounded-2xl border border-border p-4">
          <span className="text-sm font-medium text-foreground">Personas</span>
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

      {questions.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            El organizador te pregunta
          </p>
          {questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                {q.label}
                {q.required && <span className="text-destructive"> *</span>}
              </label>
              {q.type === "long_text" ? (
                <Textarea
                  rows={3}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              ) : q.type === "boolean" ? (
                <div className="flex items-center justify-between rounded-2xl border border-border p-3">
                  <span className="text-sm text-muted-foreground">
                    {answers[q.id] === "Sí" ? "Sí" : "No"}
                  </span>
                  <Switch
                    checked={answers[q.id] === "Sí"}
                    onCheckedChange={(v) =>
                      setAnswers((a) => ({ ...a, [q.id]: v ? "Sí" : "No" }))
                    }
                  />
                </div>
              ) : q.type === "select" ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                      className={cn(
                        "px-3 py-2 rounded-full text-sm font-medium border",
                        answers[q.id] === o
                          ? "bg-foreground text-background border-foreground"
                          : "bg-secondary/50 border-border text-foreground",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  type={q.type === "phone" ? "tel" : "text"}
                  inputMode={q.type === "phone" ? "tel" : undefined}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {step === "select" ? (
        <Button
          type="button"
          variant="sheet-action"
          disabled={!selected || soldOut}
          onClick={() => setStep("details")}
          className="w-full h-14 text-base font-bold uppercase tracking-wide"
        >
          {!selected
            ? hasTiers
              ? "Elegí una entrada o un área"
              : "Elegí un área"
            : soldOut
              ? "Agotado"
              : "Continuar"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="sheet-action"
          disabled={soldOut || holding}
          onClick={handleConfirm}
          className="w-full h-14 text-base font-bold uppercase tracking-wide"
        >
          {holding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Ir a pagar
        </Button>
      )}
    </div>
  );

  return createPortal(
    <AnimatePresence>
      <m.div
        key="purchase-flow"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-0 z-[70] bg-background overflow-y-auto overscroll-contain"
      >
        {header}
        {step === "select" ? selectStep : detailsStep}
        {footer}
      </m.div>
    </AnimatePresence>,
    document.body,
  );
}
