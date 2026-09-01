import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarDays, Clock, Tag, Users, CheckCircle2, Minus, Plus } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { openPaymentGateway, buildReturnUrl } from "@/lib/cardCheckout";
import {
  buildExperienceQrRequest,
  resolveExperienceBookingId,
} from "@/lib/experienceCheckout";
import {
  useExperienceConfig,
  useExperienceAvailability,
  useCreateExperienceBooking,
  type Experience,
} from "@/hooks/useExperiences";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experience: Experience;
}

type Step = "date" | "time" | "segment" | "quantity" | "pay" | "done";

const STEP_ORDER: Step[] = ["date", "time", "segment", "quantity"];
const STEP_LABEL: Record<string, string> = {
  date: "Fecha",
  time: "Hora",
  segment: "Opción",
  quantity: "Personas",
};
const STEP_ICON: Record<string, React.ReactNode> = {
  date: <CalendarDays className="h-3.5 w-3.5" />,
  time: <Clock className="h-3.5 w-3.5" />,
  segment: <Tag className="h-3.5 w-3.5" />,
  quantity: <Users className="h-3.5 w-3.5" />,
};

const DATE_CHIPS = Array.from({ length: 21 }, (_, i) => addDays(startOfDay(new Date()), i));

const money = (n: number) => (n > 0 ? `Bs. ${n.toFixed(2)}` : "Gratis");

/** Guest-facing booking flow for a paid experience: date → hora → opción → personas → pago QR. */
export const ExperienceBookingSheet = ({ open, onOpenChange, experience }: Props) => {
  const { user } = useAuth();
  const { promptAuth } = useAuthPrompt();
  const navigate = useNavigate();
  const { data: config } = useExperienceConfig(experience.id);
  const createBooking = useCreateExperienceBooking();

  const [step, setStep] = useState<Step>("date");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"qr" | "card">("qr");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (open) return;
    setStep("date");
    setDate(undefined);
    setTime("");
    setSegmentId("");
    setQuantity(1);
    setNotes("");
    setQrUrl(null);
    setSessionId(null);
    setBookingId(null);
  }, [open]);

  const dateStr = date ? format(date, "yyyy-MM-dd") : undefined;
  const { data: slots = [], isLoading: loadingSlots } = useExperienceAvailability(
    experience.id,
    dateStr,
    quantity,
  );

  const segments = useMemo(
    () => (config?.segments ?? []).filter((s) => s.is_active),
    [config],
  );
  const segment = segments.find((s) => s.id === segmentId) ?? null;
  const maxPerBooking = config?.policies?.max_per_booking ?? 8;
  const total = segment ? Number(segment.price) * quantity : 0;

  // Poll the payment session until the callback confirms it.
  useEffect(() => {
    if (!sessionId || step !== "pay") return;
    const id = window.setInterval(async () => {
      const { data } = await supabase.functions.invoke("check-qhantuy-payment-status", {
        body: { paymentSessionId: sessionId },
      });
      if (data?.status === "confirmed") {
        window.clearInterval(id);
        if (typeof data.experienceBookingId === "string") {
          setBookingId(data.experienceBookingId);
        }
        setStep("done");
      } else if (data?.status === "failed" || data?.status === "expired") {
        window.clearInterval(id);
        toast.error("El pago no se completó. Intentá de nuevo.");
        setStep("quantity");
        setQrUrl(null);
        setCardUrl(null);
        setSessionId(null);
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [sessionId, step]);

  const startPayment = async (method: "qr" | "card" = "qr") => {
    if (!user) {
      promptAuth({ action: "reservar esta experiencia" });
      return;
    }
    if (!dateStr || !time || !segmentId) return;
    // Placeholder tab must open inside the user gesture, before any await.
    const gateway = method === "card" ? openPaymentGateway() : null;
    setStarting(true);
    setPayMethod(method);
    try {
      const newBookingId = await createBooking.mutateAsync({
        experienceId: experience.id,
        segmentId,
        date: dateStr,
        time,
        quantity,
        notes: notes.trim() || undefined,
      });
      setBookingId(newBookingId);

      const { data, error } = await supabase.functions.invoke("generate-experience-qr", {
        body: buildExperienceQrRequest(
          newBookingId,
          method,
          method === "card" ? buildReturnUrl("/tickets") : undefined,
        ),
      });

      let payload: any = data;
      if (error) {
        payload = await (error as any)?.context?.json?.().catch(() => null);
      }
      if (error || payload?.error) {
        gateway?.abort();
        if (payload?.code === "no_beneficiary") {
          toast.error("El organizador todavía no habilitó los pagos. Intentá más tarde.");
          setStep("quantity");
          return;
        }
        throw new Error(payload?.error || error?.message);
      }

      setBookingId(resolveExperienceBookingId(newBookingId, payload?.experienceBookingId));
      setSessionId(payload.paymentSessionId);

      if (method === "card") {
        if (!payload?.paymentUrl) {
          gateway?.abort();
          throw new Error("No se pudo abrir el pago con tarjeta. Probá con QR.");
        }
        setCardUrl(payload.paymentUrl);
        setQrUrl(null);
        setStep("pay");
        gateway?.navigate(payload.paymentUrl);
        return;
      }

      setCardUrl(null);
      setQrUrl(payload.qrImageUrl);
      setStep("pay");
    } catch (e: any) {
      gateway?.abort();
      toast.error(e?.message || "No se pudo iniciar el pago");
    } finally {
      setStarting(false);
    }
  };



  const canContinue =
    (step === "date" && !!date) ||
    (step === "time" && !!time) ||
    (step === "segment" && !!segmentId) ||
    (step === "quantity" && quantity >= 1);

  const goNext = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i >= 0 && i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]);
    else startPayment();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl max-h-[92dvh] overflow-y-auto pb-0">
        <SheetTitle className="font-brand text-[22px] font-medium text-foreground">
          {experience.title}
        </SheetTitle>

        {step !== "pay" && step !== "done" && (
          <>
            <div className="mt-3 flex gap-1.5">
              {STEP_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    step === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-muted/50 text-muted-foreground",
                  )}
                >
                  {STEP_ICON[s]} {STEP_LABEL[s]}
                </button>
              ))}
            </div>

            <div className="mt-5 min-h-[180px]">
              {step === "date" && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {DATE_CHIPS.map((d) => {
                    const selected = dateStr === format(d, "yyyy-MM-dd");
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => {
                          setDate(d);
                          setTime("");
                        }}
                        className={cn(
                          "flex min-w-[64px] flex-col items-center rounded-2xl border px-3 py-2.5",
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-muted/40 text-foreground",
                        )}
                      >
                        <span className="text-[11px] uppercase opacity-70">
                          {format(d, "EEE", { locale: es })}
                        </span>
                        <span className="text-lg font-medium">{format(d, "d")}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === "time" && (
                <>
                  {loadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No hay horarios disponibles este día.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          disabled={s.status === "full"}
                          onClick={() => setTime(s.time)}
                          className={cn(
                            "rounded-xl border py-2.5 text-sm",
                            time === s.time
                              ? "border-foreground bg-foreground text-background"
                              : s.status === "full"
                                ? "border-border bg-muted/30 text-muted-foreground/50"
                                : "border-border bg-muted/40 text-foreground",
                          )}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {step === "segment" && (
                <div className="space-y-2">
                  {segments.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSegmentId(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border p-4 text-left",
                        segmentId === s.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-muted/40 text-foreground",
                      )}
                    >
                      <span>
                        <span className="block text-sm font-medium">{s.name}</span>
                        {s.description && <span className="block text-xs opacity-70">{s.description}</span>}
                      </span>
                      <span className="text-sm font-medium">{money(Number(s.price))}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === "quantity" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                    <span className="text-sm font-medium text-foreground">Personas</span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="rounded-full border border-border p-2"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-lg font-medium">{quantity}</span>
                      <button
                        type="button"
                        className="rounded-full border border-border p-2"
                        onClick={() => setQuantity((q) => Math.min(maxPerBooking, q + 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-4">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-brand text-lg font-medium text-foreground">{money(total)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 mt-4 bg-background/95 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
              <Button
                variant="sheet-action"
                className="h-12 w-full rounded-full text-base"
                disabled={!canContinue || starting || createBooking.isPending}
                onClick={goNext}
              >
                {starting || createBooking.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step === "quantity" ? (
                  `Pagar ${money(total)}`
                ) : (
                  "Continuar"
                )}
              </Button>
              {step === "quantity" && (
                <Button
                  variant="outline"
                  className="mt-2 h-12 w-full rounded-full text-base"
                  disabled={!canContinue || starting || createBooking.isPending}
                  onClick={() => startPayment("card")}
                >
                  Pagar con tarjeta
                </Button>
              )}
            </div>

          </>
        )}

        {step === "pay" && (
          <div className="flex flex-col items-center py-6 pb-[max(env(safe-area-inset-bottom),16px)]">
            {payMethod === "card" ? (
              <>
                <p className="px-4 text-center text-sm text-muted-foreground">
                  Completá el pago con tu tarjeta en la ventana segura de Qhantuy.
                </p>
                {cardUrl && (
                  <Button
                    variant="outline"
                    className="mt-4 h-12 rounded-full"
                    onClick={() => window.open(cardUrl, "_blank")}
                  >
                    Volver a abrir el pago
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Escaneá el QR con tu app bancaria</p>
                {qrUrl && (
                  <img
                    src={qrUrl}
                    alt={`QR de pago para ${experience.title}`}
                    className="mt-4 h-64 w-64 rounded-2xl bg-white object-contain p-2"
                  />
                )}
              </>
            )}
            <p className="mt-4 font-brand text-xl font-medium text-foreground">{money(total)}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando confirmación del pago…
            </div>
          </div>
        )}


        {step === "done" && (
          <div className="flex flex-col items-center py-10 pb-[max(env(safe-area-inset-bottom),16px)] text-center">
            <CheckCircle2 className="h-14 w-14 text-foreground" />
            <h3 className="mt-4 font-brand text-xl font-medium text-foreground">¡Reserva confirmada!</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {date && format(date, "EEEE d 'de' MMMM", { locale: es })} · {time} · {quantity}{" "}
              {quantity === 1 ? "persona" : "personas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Te enviamos la confirmación a tu correo.
            </p>
            {bookingId && (
              <Button
                variant="sheet-action"
                className="mt-6 h-12 w-full rounded-full text-base"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/experience-booking/${bookingId}`);
                }}
              >
                Ver entrada
              </Button>
            )}
            <Button
              variant={bookingId ? "outline" : "sheet-action"}
              className={cn("h-12 w-full rounded-full text-base", bookingId ? "mt-2" : "mt-6")}
              onClick={() => onOpenChange(false)}
            >
              Listo
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
