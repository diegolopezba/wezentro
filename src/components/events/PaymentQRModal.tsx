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


interface PaymentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  price: number;
  ticketTierId?: string | null;
  ticketTierName?: string | null;
  /** "paid" = Qhantuy QR checkout (default). "free" = confirm-to-join sheet. */
  mode?: "paid" | "free";
  /** Called when the user taps "Sí, quiero unirme" in free mode. Should throw on failure. */
  onJoinFree?: () => Promise<void>;
  onPaymentConfirmed: () => Promise<void>;
}

type Step = "details" | "loading" | "revealed" | "success" | "expired" | "error";

export function PaymentQRModal({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  price,
  ticketTierId,
  ticketTierName,
  mode = "paid",
  onJoinFree,
  onPaymentConfirmed,
}: PaymentQRModalProps) {
  const navigate = useNavigate();
  const isFree = mode === "free";
  const [step, setStep] = useState<Step>("details");
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
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

  const generateQR = useCallback(async () => {
    if (!isActiveRef.current) return;
    setStep("loading");
    setErrorMsg(null);
    try {
      const { getAttribution } = await import("@/lib/promoterAttribution");
      const promoterId = eventId ? getAttribution(eventId) : null;
      const { data, error } = await supabase.functions.invoke("generate-qhantuy-qr", {
        body: { eventId, ticketTierId: ticketTierId ?? null, promoterId },
      });
      if (error || !data || (data as any).error) {
        setErrorMsg((data as any)?.error || error?.message || "No se pudo generar el QR");
        setStep("error");
        return;
      }
      const sessionId = (data as any).paymentSessionId;
      setQrImageUrl((data as any).qrImageUrl);
      setPaymentSessionId(sessionId);
      setStep("revealed");
      startPolling(sessionId);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo generar el QR");
      setStep("error");
    }
  }, [eventId, ticketTierId, startPolling]);

  const confirmFreeJoin = useCallback(async () => {
    if (!isActiveRef.current || !onJoinFree) return;
    setStep("loading");
    setErrorMsg(null);
    try {
      await onJoinFree();
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo confirmar tu lugar");
      setStep("error");
    }
  }, [onJoinFree]);

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
    navigate(eventId ? `/going/${eventId}` : "/settings/tickets");
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
                <h2 className="text-3xl font-brand font-bold text-foreground leading-tight line-clamp-2">
                  {eventTitle}
                </h2>
              </div>

              {/* Ticket card */}
              <div className="px-5">
                <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold uppercase tracking-tight text-foreground truncate">
                        {ticketTierName || "Entrada general"}
                      </p>
                      <p className="text-lg font-brand font-bold text-foreground mt-0.5">
                        {isFree ? "Gratis" : `Bs. ${price}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center justify-center min-w-8 h-8 px-3 rounded-full bg-secondary text-sm font-semibold text-foreground">
                        1
                      </span>
                    </div>
                  </div>
                </div>
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
                        {(isFree
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
                    <p className="text-xs text-muted-foreground">1 entrada seleccionada</p>
                    <p className="text-2xl font-brand font-bold text-foreground">Total</p>
                  </div>
                  {isFree ? (
                    <p className="text-lg font-brand font-normal text-foreground flex items-center gap-1.5">
                      tranqui, es gratis
                      <span className="text-lg leading-none" role="img" aria-label="guiño">😉</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-brand font-bold text-foreground">Bs. {price}</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={isFree ? confirmFreeJoin : generateQR}
                  className="w-full h-14 rounded-2xl bg-foreground text-background text-base font-bold uppercase tracking-wide active:opacity-90"
                >
                  {isFree ? "Sí, quiero unirme" : "Pagar por QR"}
                </Button>
              </div>
            </m.div>
          )}

          {step === "loading" && (
            <m.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 px-6 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando tu QR de pago…</p>
            </m.div>
          )}

          {step === "revealed" && qrImageUrl && (
            <m.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-6 pt-6 pb-8 space-y-4 text-center overflow-y-auto max-h-[92dvh]">
              <div className="space-y-1">
                <h2 className="text-lg font-brand font-bold text-foreground">{eventTitle}</h2>
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
                <h2 className="text-2xl font-brand font-bold text-foreground">¡Estás dentro!</h2>
                <p className="text-sm text-muted-foreground">Tu entrada para <span className="text-foreground font-medium">{eventTitle}</span> está confirmada.</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/60">
                <p className="text-xs text-muted-foreground">
                  Guarda tu entrada — la vas a necesitar en la puerta.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleViewTickets}
                className="w-full h-14 rounded-2xl bg-foreground text-background text-base font-bold uppercase tracking-wide active:opacity-90"
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
              <h2 className="text-xl font-brand font-bold text-foreground">QR Expirado</h2>
              <p className="text-muted-foreground text-sm">El código QR expiró sin detectar un pago.</p>
              <Button onClick={generateQR} className="w-full h-14 rounded-2xl bg-foreground text-background font-bold uppercase active:opacity-90">
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
              <h2 className="text-xl font-brand font-bold text-foreground">{isFree ? "No se pudo confirmar tu lugar" : "No se pudo generar el QR"}</h2>
              <p className="text-muted-foreground text-sm">{errorMsg || "Por favor intenta de nuevo."}</p>
              <Button onClick={isFree ? confirmFreeJoin : generateQR} className="w-full h-14 rounded-2xl bg-foreground text-background font-bold uppercase active:opacity-90">
                <RefreshCw className="w-4 h-4 mr-2" />Reintentar
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleClose}>Cancelar</Button>
            </m.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
