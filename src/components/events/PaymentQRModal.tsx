/**
 * APPLE IAP EXEMPTION (App Store Review Note):
 * This modal sells tickets to PHYSICAL real-world events (clubs, bars, concerts
 * in Bolivia). Per App Store Review Guideline 3.1.3(e), goods or services
 * consumed outside the app are NOT required to use Apple In-App Purchase.
 * Payment is processed via QR through Qhantuy (Bolivian banking infrastructure).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, Camera, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface PaymentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  price: number;
  /** Optional ticket tier id — when set, the QR is generated for this specific tier. */
  ticketTierId?: string | null;
  /** Optional tier name to display in the header alongside the event title. */
  ticketTierName?: string | null;
  onPaymentConfirmed: () => Promise<void>;
}

type Step = "loading" | "blurred" | "revealed" | "polling" | "success" | "expired" | "error";

export function PaymentQRModal({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  price,
  ticketTierId,
  onPaymentConfirmed,
}: PaymentQRModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      setQrImageUrl((data as any).qrImageUrl);
      setPaymentSessionId((data as any).paymentSessionId);
      setStep("blurred");
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo generar el QR");
      setStep("error");
    }
  }, [eventId, ticketTierId]);

  useEffect(() => {
    if (open) {
      isActiveRef.current = true;
      generateQR();
    } else {
      isActiveRef.current = false;
      stopPolling();
      setTimeout(() => {
        setStep("loading");
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

  const handleRevealQR = () => {
    if (!paymentSessionId) return;
    setStep("polling");
    startPolling(paymentSessionId);
  };

  const handleViewTickets = () => {
    onOpenChange(false);
    navigate("/tickets");
  };

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
        <AnimatePresence mode="wait">
          {step === "loading" && (
            <m.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando tu QR de pago...</p>
            </m.div>
          )}

          {step === "blurred" && qrImageUrl && (
            <m.div key="blurred" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <h2 className="text-xl font-brand font-bold text-foreground">{eventTitle}</h2>
              <p className="text-lg font-semibold text-primary">Bs. {price}</p>

              <div className="relative mx-auto w-56 h-56 rounded-2xl overflow-hidden bg-secondary">
                <img src={qrImageUrl} alt="QR de pago" className="w-full h-full object-contain blur-xl" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                  <QrCode className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">QR oculto</p>
                </div>
              </div>

              <p className="text-muted-foreground text-sm">
                QR dinámico generado para este pago. Escanéalo con cualquier app bancaria boliviana.
              </p>

              <Button variant="hero" className="w-full" onClick={handleRevealQR}>
                Ver QR de Pago
              </Button>

              <p className="text-xs text-muted-foreground">
                ✓ QR generado en tiempo real — confirmación automática
              </p>
            </m.div>
          )}

          {(step === "revealed" || step === "polling") && qrImageUrl && (
            <m.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <h2 className="text-xl font-brand font-bold text-foreground">{eventTitle}</h2>
              <p className="text-lg font-semibold text-primary">Bs. {price}</p>

              <div className="mx-auto w-56 h-56 rounded-2xl overflow-hidden bg-white p-2">
                <img src={qrImageUrl} alt="QR de pago" className="w-full h-full object-contain" />
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-primary">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Esperando confirmación automática...
              </div>

              <div className="text-left space-y-2 p-4 rounded-xl bg-secondary/50">
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground"><span className="font-semibold">1.</span> Captura pantalla del QR</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 text-base leading-none">📱</span>
                  <p className="text-sm text-foreground"><span className="font-semibold">2.</span> Abre tu app de banco</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 text-base leading-none">💵</span>
                  <p className="text-sm text-foreground"><span className="font-semibold">3.</span> Escanea y paga Bs. {price}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-sm text-primary font-medium">
                  Tu entrada se confirmará automáticamente al pagar
                </p>
              </div>
            </m.div>
          )}

          {step === "success" && (
            <m.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-brand font-bold text-foreground">¡Pago Confirmado!</h2>
              <p className="text-muted-foreground text-sm">Tu pago fue detectado automáticamente. ¡Ya estás en la lista!</p>
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-sm text-foreground">
                  Tu entrada aparecerá en la sección <strong>"Entradas"</strong> de tu perfil.
                </p>
              </div>
              <Button variant="hero" className="w-full" onClick={handleViewTickets}>Ver Entradas</Button>
            </m.div>
          )}

          {step === "expired" && (
            <m.div key="expired" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-orange-500" />
              </div>
              <h2 className="text-xl font-brand font-bold text-foreground">QR Expirado</h2>
              <p className="text-muted-foreground text-sm">El código QR expiró sin detectar un pago.</p>
              <Button variant="hero" className="w-full" onClick={generateQR}>
                <RefreshCw className="w-4 h-4 mr-2" />Generar nuevo QR
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleClose}>Cancelar</Button>
            </m.div>
          )}

          {step === "error" && (
            <m.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-brand font-bold text-foreground">No se pudo generar el QR</h2>
              <p className="text-muted-foreground text-sm">{errorMsg || "Por favor intenta de nuevo."}</p>
              <Button variant="hero" className="w-full" onClick={generateQR}>
                <RefreshCw className="w-4 h-4 mr-2" />Reintentar
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleClose}>Cancelar</Button>
            </m.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
