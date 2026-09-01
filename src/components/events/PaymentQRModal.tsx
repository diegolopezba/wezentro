/**
 * APPLE IAP EXEMPTION (App Store Review Note):
 * This modal sells tickets to PHYSICAL real-world events (clubs, bars, concerts
 * in Bolivia). Per App Store Review Guideline 3.1.3(e), goods or services
 * consumed outside the app are NOT required to use Apple In-App Purchase.
 * Payment is processed via QR through Qhantuy (Bolivian banking infrastructure).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronDown, QrCode, CheckCircle, Camera, Loader2, RefreshCw, AlertCircle, Sparkles, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TicketAssigneeRow } from "./TicketAssigneeRow";
import type { SearchUser } from "@/hooks/useSearchUsers";
import { Minus, Plus, CreditCard, ExternalLink } from "lucide-react";
import { openPaymentGateway, buildReturnUrl } from "@/lib/cardCheckout";


interface PaymentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  price: number;
  ticketTierId?: string | null;
  ticketTierName?: string | null;
  /** Visual venue layout checkout: the area being bought and its existing hold. */
  eventAreaId?: string | null;
  areaBookingId?: string | null;
  partySize?: number | null;
  /** "paid" = Qhantuy QR checkout (default). "free" = confirm-to-join sheet. "invite" = special guest invitation. */
  mode?: "paid" | "free" | "invite";
  /** Called when the user confirms in free/invite mode. Should throw on failure. */
  onJoinFree?: () => Promise<void>;
  onPaymentConfirmed: () => Promise<void>;
}

type Step = "details" | "loading" | "revealed" | "card" | "success" | "expired" | "error";

export function PaymentQRModal({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  price,
  ticketTierId,
  ticketTierName,
  eventAreaId,
  areaBookingId,
  partySize,
  mode = "paid",
  onJoinFree,
  onPaymentConfirmed,
}: PaymentQRModalProps) {
  const navigate = useNavigate();
  const isInvite = mode === "invite";
  /** A paid checkout whose selected tier/area costs Bs. 0 behaves as a free confirmation. */
  const isFreeTier = mode === "paid" && Number(price || 0) <= 0;
  const isFree = mode === "free" || isInvite || isFreeTier;
  const [step, setStep] = useState<Step>("details");
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"qr" | "card">("qr");
  const payMethodRef = useRef<"qr" | "card">("qr");
  payMethodRef.current = payMethod;
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);


  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [assignees, setAssignees] = useState<(SearchUser | null)[]>([]);
  // Multi-ticket buying only applies to paid general/tier checkout, not venue areas.
  const canBuyMultiple = !isFree && !eventAreaId;
  const total = Number(price) * (canBuyMultiple ? quantity : 1);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleConfirmed = useCallback(async () => {
    stopPolling();
    try { await onPaymentConfirmed(); } catch { /* handled */ }
    setStep("success");
  }, [onPaymentConfirmed, stopPolling]);

  const startPolling = useCallback((sessionId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      if (!isActiveRef.current) return;
      try {
        const { data, error } = await supabase.functions.invoke("check-qhantuy-payment-status", {
          body: { paymentSessionId: sessionId },
        });
        if (error) return;
        const status = (data as any)?.status;
        if (status === "confirmed") {
          await handleConfirmed();
        } else if (status === "expired") {
          stopPolling(); setStep("expired");
        } else if (status === "failed") {
          stopPolling(); setStep("error");
        }
      } catch { /* retry silently */ }
    }, 3000);
  }, [stopPolling, handleConfirmed]);

  const goToLogin = useCallback(() => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    navigate("/auth", { state: { mode: "signin", returnTo } });
  }, [navigate]);


  /** Make sure the access token is fresh before hitting an authed function. */
  const ensureFreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return false;
      const expiresAt = (session.expires_at ?? 0) * 1000;
      if (expiresAt - Date.now() < 60_000) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error || !refreshed.session) return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const generateCheckout = useCallback(async (method: "qr" | "card" = "qr") => {
    if (!isActiveRef.current) return;
    // The placeholder tab must be opened inside the click, before any await.
    const gateway = method === "card" ? openPaymentGateway() : null;
    setStep("loading");
    setPayMethod(method);
    setErrorMsg(null);
    setNeedsLogin(false);
    try {
      const fresh = await ensureFreshSession();
      if (!fresh) {
        gateway?.abort();
        setErrorMsg("Tu sesión expiró. Inicia sesión de nuevo para continuar.");
        setNeedsLogin(true);
        setStep("error");
        return;
      }

      const { getAttribution, clearAttribution } = await import("@/lib/promoterAttribution");
      const raw = eventId ? getAttribution(eventId) : null;
      // Only forward a well-formed uuid — a stale/garbled referral must never block a sale.
      const isUuid = !!raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
      if (raw && !isUuid) clearAttribution(eventId);
      const promoterId = isUuid ? raw : null;
      const { data, error } = await supabase.functions.invoke("generate-qhantuy-qr", {
        body: {
          eventId,
          ticketTierId: ticketTierId ?? null,
          promoterId,
          eventAreaId: eventAreaId ?? null,
          areaBookingId: areaBookingId ?? null,
          quantity: canBuyMultiple ? quantity : 1,
          assignees: canBuyMultiple ? assignees.slice(0, quantity - 1).map((a) => a?.id ?? null) : [],
          method,
          returnUrl: method === "card" ? buildReturnUrl(`/going/${eventId}`) : undefined,
        },
      });
      if (error || !data || (data as any).error) {
        // supabase-js throws FunctionsHttpError on any non-2xx and drops the body,
        // so read the real server message out of error.context.
        let serverMsg: string | null = (data as any)?.error ?? null;
        let serverCode: string | null = (data as any)?.code ?? null;
        const ctx = (error as any)?.context;
        if (!serverMsg && ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            serverMsg = body?.error ?? null;
            serverCode = body?.code ?? null;
          } catch { /* body not json */ }
        }
        if (serverCode === "session_expired" || serverCode === "no_auth_header") {
          setNeedsLogin(true);
        }
        gateway?.abort();
        setErrorMsg(serverMsg || error?.message || "No se pudo iniciar el pago");
        setStep("error");
        return;
      }
      const sessionId = (data as any).paymentSessionId;
      const paymentUrl = (data as any).paymentUrl as string | null;

      if (method === "card") {
        if (!paymentUrl) {
          gateway?.abort();
          setErrorMsg("No se pudo abrir el pago con tarjeta. Probá con QR.");
          setStep("error");
          return;
        }
        setPaymentSessionId(sessionId);
        setCardUrl(paymentUrl);
        setStep("card");
        startPolling(sessionId);
        gateway?.navigate(paymentUrl);
        return;
      }

      setQrImageUrl((data as any).qrImageUrl);
      setPaymentSessionId(sessionId);
      setStep("revealed");
      startPolling(sessionId);
    } catch (err: any) {
      gateway?.abort();
      setErrorMsg(err?.message || "No se pudo iniciar el pago");
      setStep("error");
    }
  }, [eventId, ticketTierId, eventAreaId, areaBookingId, startPolling, ensureFreshSession, canBuyMultiple, quantity, assignees]);

  const generateQR = useCallback(() => generateCheckout("qr"), [generateCheckout]);
  const generateCardCheckout = useCallback(() => generateCheckout("card"), [generateCheckout]);
  const retryCheckout = useCallback(() => generateCheckout(payMethodRef.current), [generateCheckout]);


  const confirmFreeJoin = useCallback(async () => {
    if (!isActiveRef.current || !onJoinFree) return;
    setStep("loading");
    setErrorMsg(null);
    setNeedsLogin(false);
    try {
      const fresh = await ensureFreshSession();
      if (!fresh) {
        setErrorMsg("Tu sesión expiró. Inicia sesión de nuevo para continuar.");
        setNeedsLogin(true);
        setStep("error");
        return;
      }
      await onJoinFree();
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo confirmar tu lugar");
      setStep("error");
    }
  }, [onJoinFree, ensureFreshSession]);


  useEffect(() => {
    if (open) {
      isActiveRef.current = true;
      setStep("details");
    } else {
      isActiveRef.current = false;
      stopPolling();
      setTimeout(() => {
        setStep("details");
        setQrImageUrl(null);
        setPaymentSessionId(null);
        setErrorMsg(null);
        setQuantity(1);
        setAssignees([]);
      }, 300);
    }
    return () => {
      isActiveRef.current = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleViewTickets = () => {
    onOpenChange(false);
    navigate(eventId ? `/going/${eventId}` : "/tickets");
  };

  const handleDownloadQR = async () => {
    if (!qrImageUrl) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(qrImageUrl);
      if (!response.ok) throw new Error("No se pudo descargar la imagen");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `zentro-qr-${eventId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError("No se pudo descargar. Intenta con una captura de pantalla.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl border-border bg-background p-0 max-h-[92dvh] overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === "details" && (
            <m.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-[85dvh]">
              {/* Header */}
              <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:opacity-70"
                  aria-label="Cerrar"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Entrada
                </span>
              </div>

              {/* Title */}
              <div className="px-5 pt-2 pb-4">
                <h2 className="text-3xl font-brand font-medium text-foreground leading-tight line-clamp-2">
                  {eventTitle}
                </h2>
              </div>

              {/* Ticket card + quantity */}
              <div className="px-5 flex-1 min-h-0 overflow-y-auto pb-4">
                <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold uppercase tracking-tight text-foreground truncate">
                        {ticketTierName || "Entrada general"}
                      </p>
                      <p className="text-lg font-brand font-medium text-foreground mt-0.5">
                        {isInvite ? "Invitado especial" : isFree ? "Gratis" : `Bs. ${price}`}
                      </p>
                    </div>
                    {canBuyMultiple ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Quitar una entrada"
                          disabled={quantity <= 1}
                          onClick={() => {
                            setQuantity((q) => Math.max(q - 1, 1));
                            setAssignees((a) => a.slice(0, Math.max(quantity - 2, 0)));
                          }}
                          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:opacity-70 disabled:opacity-40"
                        >
                          <Minus className="w-4 h-4 text-foreground" />
                        </button>
                        <span className="min-w-6 text-center text-base font-bold text-foreground">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Agregar una entrada"
                          disabled={quantity >= 10}
                          onClick={() => setQuantity((q) => Math.min(q + 1, 10))}
                          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:opacity-70 disabled:opacity-40"
                        >
                          <Plus className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="inline-flex items-center justify-center min-w-8 h-8 px-3 rounded-full bg-secondary text-sm font-semibold text-foreground">
                          {partySize && partySize > 1 ? partySize : 1}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {canBuyMultiple && quantity > 1 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground px-1">
                      ¿Para quién son?
                    </p>
                    {Array.from({ length: quantity - 1 }).map((_, i) => (
                      <TicketAssigneeRow
                        key={i}
                        index={i}
                        value={assignees[i] ?? null}
                        excludeIds={assignees.filter(Boolean).map((a) => a!.id)}
                        onChange={(u) =>
                          setAssignees((prev) => {
                            const next = [...prev];
                            while (next.length < quantity - 1) next.push(null);
                            next[i] = u;
                            return next;
                          })
                        }
                      />
                    ))}
                    <p className="text-xs text-muted-foreground px-1 pt-1">
                      Las entradas sin etiquetar te llegan por correo para que las reenvíes.
                    </p>
                  </div>
                )}
              </div>


              {/* How it works (collapsible) */}
              <div className="px-5 mt-6">
                <button
                  type="button"
                  onClick={() => setHowOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl bg-card border border-border px-4 py-3 active:opacity-70 transition-opacity"
                  aria-expanded={howOpen}
                >
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    ¿Cómo funciona?
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${howOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {howOpen && (
                    <m.div
                      key="how-it-works"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2.5 px-1 pt-3">
                        {(isInvite
                          ? [
                              "El organizador te invitó a este evento.",
                              "Confirmá tu invitación especial.",
                              "Tu entrada queda lista, sin pagar nada.",
                            ]
                          : isFree
                          ? [
                              "Confirmá que querés unirte a este evento.",
                              "Quedás en la lista al instante.",
                              "Mostrá tu entrada en la puerta y listo.",
                            ]
                          : [
                              "Generamos un QR único para tu compra.",
                              "Escanéalo desde tu app bancaria y paga.",
                              "Volvé a zentro, validamos en segundos y estás dentro.",
                            ]
                        ).map((text, i) => (
                          <div key={i} className="flex gap-3 text-sm text-foreground">
                            <span className="w-5 shrink-0 font-bold text-primary">{i + 1}.</span>
                            <span>{text}</span>
                          </div>
                        ))}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>


              {/* Footer with total + CTA */}
              <div className="mt-auto px-5 pt-4 pb-6 border-t border-border bg-background">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {canBuyMultiple && quantity > 1
                        ? `${quantity} entradas seleccionadas`
                        : partySize && partySize > 1
                        ? `${partySize} personas`
                        : "1 entrada seleccionada"}
                    </p>
                    <p className="text-2xl font-brand font-medium text-foreground">Total</p>
                  </div>
                  {isFree ? (
                    <p className="text-lg font-brand font-normal text-foreground flex items-center gap-1.5">
                      {isInvite ? "invitación especial" : "tranqui, es gratis"}
                      <span className="text-lg leading-none" role="img" aria-label="guiño">😉</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-brand font-medium text-foreground">Bs. {total}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="sheet-action"
                  onClick={isFree ? confirmFreeJoin : generateQR}
                  className="w-full h-14 text-base font-bold uppercase tracking-wide"
                >
                  {isInvite
                    ? "Confirmar invitación especial"
                    : isFreeTier
                    ? "Confirmar entrada gratis"
                    : isFree
                    ? "Sí, quiero unirme"
                    : "Pagar por QR"}
                </Button>
                {!isFree && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCardCheckout}
                    className="w-full h-14 text-base font-bold uppercase tracking-wide rounded-full gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pagar con tarjeta
                  </Button>
                )}
              </div>
            </m.div>
          )}

          {step === "loading" && (
            <m.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 px-6 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {payMethod === "card" ? "Abriendo el pago seguro…" : "Generando tu QR de pago…"}
              </p>
            </m.div>
          )}

          {step === "card" && cardUrl && (
            <m.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-6 pb-8 space-y-4 text-center">
              <div className="space-y-1">
                <h2 className="text-lg font-brand font-medium text-foreground">{eventTitle}</h2>
                <p className="text-lg font-semibold text-primary">Bs. {total}</p>
              </div>
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Completá el pago con tu tarjeta en la ventana segura de Qhantuy.
                  Apenas se confirme, tu entrada aparece acá automáticamente.
                </p>
              </div>
              <Button
                type="button"
                variant="sheet-action"
                onClick={() => window.open(cardUrl, "_blank")}
                className="w-full h-14 font-bold uppercase gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Volver a abrir el pago
              </Button>
              <button
                type="button"
                onClick={generateQR}
                className="text-xs text-muted-foreground underline underline-offset-4"
              >
                Prefiero pagar con QR
              </button>
            </m.div>
          )}


          {step === "revealed" && qrImageUrl && (
            <m.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-6 pb-8 space-y-4 text-center overflow-y-auto max-h-[92dvh]">
              <div className="space-y-1">
                <h2 className="text-lg font-brand font-medium text-foreground">{eventTitle}</h2>
                <p className="text-lg font-semibold text-primary">Bs. {price}</p>
              </div>

              <div className="mx-auto w-56 h-56 rounded-2xl overflow-hidden bg-white p-2 border border-border">
                <img src={qrImageUrl} alt="QR de pago" className="w-full h-full object-contain" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="w-full h-12 rounded-2xl border-border bg-background text-foreground font-semibold active:opacity-90"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Descargar QR
              </Button>

              {downloadError && (
                <p className="text-xs text-destructive">{downloadError}</p>
              )}

              <div className="flex items-center justify-center gap-1.5 text-xs text-primary">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Esperando confirmación automática…
              </div>

              <div className="text-left space-y-2 p-4 rounded-2xl bg-secondary/60">
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground"><span className="font-semibold">1.</span> Captura o escanea el QR</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 text-base leading-none">📱</span>
                  <p className="text-sm text-foreground"><span className="font-semibold">2.</span> Abre tu app de banco</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 text-base leading-none">💵</span>
                  <p className="text-sm text-foreground"><span className="font-semibold">3.</span> Paga Bs. {price} y vuelve</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-xs text-primary font-medium">
                  Toma unos segundos después de pagar
                </p>
              </div>
            </m.div>
          )}

          {step === "success" && (
            <m.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="px-6 pt-8 pb-8 space-y-5 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center relative">
                <CheckCircle className="w-12 h-12 text-primary" />
                <Sparkles className="w-5 h-5 text-primary absolute top-1 right-1" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-brand font-medium text-foreground">¡Estás dentro!</h2>
                <p className="text-sm text-muted-foreground">Tu entrada para <span className="text-foreground font-medium">{eventTitle}</span> está confirmada.</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/60">
                <p className="text-xs text-muted-foreground">
                  Guarda tu entrada — la vas a necesitar en la puerta.
                </p>
              </div>
              <Button
                type="button"
                variant="sheet-action"
                onClick={handleViewTickets}
                className="w-full h-14 text-base font-bold uppercase tracking-wide"
              >
                Ver mi entrada
              </Button>
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-muted-foreground active:opacity-70"
              >
                Cerrar
              </button>
            </m.div>
          )}

          {step === "expired" && (
            <m.div key="expired" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-8 pb-8 space-y-4 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-brand font-medium text-foreground">QR Expirado</h2>
              <p className="text-muted-foreground text-sm">El código QR expiró sin detectar un pago.</p>
                <Button variant="sheet-action" onClick={retryCheckout} className="w-full h-14 font-bold uppercase">
                  <RefreshCw className="w-4 h-4 mr-2" />Generar nuevo QR
                </Button>
              <Button variant="ghost" className="w-full" onClick={handleClose}>Cancelar</Button>
            </m.div>
          )}

          {step === "error" && (
            <m.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-8 pb-8 space-y-4 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-brand font-medium text-foreground">{needsLogin ? "Inicia sesión de nuevo" : isInvite ? "No se pudo confirmar tu invitación" : isFree ? "No se pudo confirmar tu lugar" : "No se pudo generar el QR"}</h2>
              <p className="text-muted-foreground text-sm">{errorMsg || "Por favor intenta de nuevo."}</p>
                {needsLogin ? (
                  <Button variant="sheet-action" onClick={goToLogin} className="w-full h-14 font-bold uppercase">
                    Iniciar sesión
                  </Button>
                ) : (
                  <Button variant="sheet-action" onClick={isFree ? confirmFreeJoin : retryCheckout} className="w-full h-14 font-bold uppercase">
                    <RefreshCw className="w-4 h-4 mr-2" />Reintentar
                  </Button>
                )}
              <Button variant="ghost" className="w-full" onClick={handleClose}>Cancelar</Button>
            </m.div>
          )}

        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
