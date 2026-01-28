import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  price: number;
  paymentQrUrl: string;
  onPaymentSubmitted: () => Promise<void>;
  isSubmitting?: boolean;
}

type Step = "blurred" | "revealed" | "success";

export function PaymentQRModal({
  open,
  onOpenChange,
  eventTitle,
  price,
  paymentQrUrl,
  onPaymentSubmitted,
  isSubmitting = false,
}: PaymentQRModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("blurred");

  const handleRevealQR = () => {
    setStep("revealed");
  };

  const handlePaymentDone = async () => {
    await onPaymentSubmitted();
    setStep("success");
  };

  const handleViewTickets = () => {
    onOpenChange(false);
    setStep("blurred");
    navigate("/tickets");
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset step after modal closes
    setTimeout(() => setStep("blurred"), 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
        <AnimatePresence mode="wait">
          {step === "blurred" && (
            <motion.div
              key="blurred"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Event Title */}
              <h2 className="text-xl font-brand font-bold text-foreground">
                {eventTitle}
              </h2>

              {/* Price */}
              <p className="text-lg font-semibold text-primary">
                Precio: Bs {price}
              </p>

              {/* Blurred QR */}
              <div className="relative mx-auto w-56 h-56 rounded-2xl overflow-hidden bg-secondary">
                <img
                  src={paymentQrUrl}
                  alt="QR de pago"
                  className="w-full h-full object-contain blur-xl"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                  <QrCode className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">QR oculto</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-sm">
                Para confirmar tu lugar, realiza el pago escaneando el QR
              </p>

              {/* Reveal Button */}
              <Button
                variant="hero"
                className="w-full"
                onClick={handleRevealQR}
              >
                Ver QR de Pago
              </Button>
            </motion.div>
          )}

          {step === "revealed" && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Event Title */}
              <h2 className="text-xl font-brand font-bold text-foreground">
                {eventTitle}
              </h2>

              {/* Price */}
              <p className="text-lg font-semibold text-primary">
                Precio: Bs {price}
              </p>

              {/* Revealed QR */}
              <div className="mx-auto w-56 h-56 rounded-2xl overflow-hidden bg-white p-2">
                <img
                  src={paymentQrUrl}
                  alt="QR de pago"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Instructions */}
              <div className="text-left space-y-2 p-4 rounded-xl bg-secondary/50">
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">1.</span> Captura pantalla del QR
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-primary shrink-0">
                    📱
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">2.</span> Abre tu app de banco
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-primary shrink-0">
                    💵
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">3.</span> Escanea y paga Bs {price}
                  </p>
                </div>
              </div>

              {/* Confirm Payment Button */}
              <Button
                variant="hero"
                className="w-full"
                onClick={handlePaymentDone}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Registrando...
                  </>
                ) : (
                  "Ya Pagué"
                )}
              </Button>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-brand font-bold text-foreground">
                ¡Pago Registrado!
              </h2>

              {/* Description */}
              <p className="text-muted-foreground text-sm">
                El organizador confirmará tu pago. Esto puede tomar unos minutos o un par de horas.
              </p>

              {/* Info */}
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-sm text-foreground">
                  Tu entrada aparecerá en la sección <strong>"Entradas"</strong> de tu perfil.
                </p>
              </div>

              {/* View Tickets Button */}
              <Button
                variant="hero"
                className="w-full"
                onClick={handleViewTickets}
              >
                Ver Entradas
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
