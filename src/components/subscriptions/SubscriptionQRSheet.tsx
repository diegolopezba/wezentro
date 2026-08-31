import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  SubscriptionCheckout,
  checkSubscriptionPayment,
} from "@/lib/subscriptionBilling";
import { SUBSCRIPTION_TIERS, formatBs } from "@/lib/subscriptionTiers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkout: SubscriptionCheckout | null;
}

/** Shows the Qhantuy QR for a plan and polls until the payment is confirmed. */
export const SubscriptionQRSheet = ({ open, onOpenChange, checkout }: Props) => {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !checkout) return;
    setConfirmed(false);
    setFailed(false);

    let cancelled = false;
    const poll = async () => {
      const status = await checkSubscriptionPayment(checkout.paymentSessionId);
      if (cancelled) return;
      if (status === "confirmed") {
        setConfirmed(true);
        queryClient.invalidateQueries({ queryKey: ["business-subscription"] });
        return;
      }
      if (status === "failed" || status === "expired") {
        setFailed(true);
        return;
      }
      timer.current = window.setTimeout(poll, 3000);
    };
    timer.current = window.setTimeout(poll, 3000);

    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [open, checkout, queryClient]);

  if (!checkout) return null;
  const planName = SUBSCRIPTION_TIERS[checkout.tier].name;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-0">
        <SheetTitle className="sr-only">Pagar plan {planName}</SheetTitle>

        {confirmed ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-14 w-14 text-foreground" />
            <h2 className="mt-4 font-brand text-[26px] font-medium leading-tight text-foreground">
              Plan {planName} activo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ya podés usar todas las funciones incluidas. Te enviamos el comprobante por email.
            </p>
            <div className="mt-6 w-full pb-[max(env(safe-area-inset-bottom),12px)]">
              <Button
                variant="sheet-action"
                className="h-12 w-full rounded-full text-base"
                onClick={() => onOpenChange(false)}
              >
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-brand text-[26px] font-medium leading-tight text-foreground">
              Pagá {formatBs(checkout.amount)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan {planName} · {checkout.label}
            </p>

            <div className="mt-4 flex justify-center">
              <img
                src={checkout.qrImageUrl}
                alt={`QR de pago del plan ${planName}`}
                className="h-64 w-64 rounded-2xl bg-white object-contain p-2"
              />
            </div>

            <p className="mt-3 text-center text-[13px] text-muted-foreground">
              Escaneá el QR con la app de tu banco. La activación es automática.
            </p>

            <div className="mt-5 pb-[max(env(safe-area-inset-bottom),12px)]">
              {failed ? (
                <p className="pb-3 text-center text-[13px] text-muted-foreground">
                  El pago no se completó. Cerrá y generá un QR nuevo.
                </p>
              ) : (
                <div className="flex items-center justify-center gap-2 pb-3 text-[13px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Esperando confirmación del pago…
                </div>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full py-2 text-sm font-medium text-muted-foreground active:opacity-60"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
