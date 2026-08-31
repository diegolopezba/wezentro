import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  BillingInterval,
  SUBSCRIPTION_TIERS,
  TierKey,
  cyclePrice,
  formatBs,
  yearlyEquivalentLabel,
} from "@/lib/subscriptionTiers";
import {
  SubscriptionCheckout,
  startSubscriptionCheckout,
} from "@/lib/subscriptionBilling";
import { SubscriptionQRSheet } from "@/components/subscriptions/SubscriptionQRSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: TierKey;
  interval?: BillingInterval;
  /** True when the business already has an active plan (mid-cycle upgrade). */
  isUpgrade?: boolean;
}

/** Final confirmation step: plan summary, what unlocks, and QR payment. */
export const PlanConfirmSheet = ({
  open,
  onOpenChange,
  tier,
  interval = "month",
  isUpgrade = false,
}: Props) => {
  const config = SUBSCRIPTION_TIERS[tier];
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<SubscriptionCheckout | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const pay = async () => {
    setLoading(true);
    try {
      const result = await startSubscriptionCheckout(tier, interval);
      setCheckout(result);
      onOpenChange(false);
      setQrOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "No pudimos generar el QR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-0">
          <SheetTitle className="sr-only">Confirmar plan {config.name}</SheetTitle>

          <h2 className="font-brand text-[26px] font-medium leading-tight text-foreground">
            Plan {config.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatBs(cyclePrice(tier, interval))}
            {interval === "year" ? " por 12 meses" : " por mes"} · {config.sizeLabel}
          </p>
          {interval === "year" && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {yearlyEquivalentLabel(tier)} · 5% de descuento aplicado
            </p>
          )}

          <div className="mt-4 space-y-2">
            {config.bullets.slice(0, 5).map((b) => (
              <div key={b} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <p className="text-[13px] leading-snug text-foreground">{b}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-muted/60 p-4">
            <p className="text-[13px] leading-snug text-muted-foreground">
              {isUpgrade
                ? "Si estás cambiando de plan a mitad de ciclo, solo pagás la diferencia por los días que te quedan y mantenés tu fecha de renovación."
                : "Pagás con QR desde tu banco y el plan se activa al instante. Sin débito automático: te avisamos antes de cada renovación."}
            </p>
          </div>

          <div className="mt-5 pb-[max(env(safe-area-inset-bottom),12px)]">
            <Button
              variant="sheet-action"
              disabled={loading}
              className="h-12 w-full rounded-full text-base"
              onClick={pay}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando QR…
                </span>
              ) : (
                "Pagar con QR"
              )}
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2 w-full py-2 text-sm font-medium text-muted-foreground active:opacity-60"
            >
              Ahora no
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <SubscriptionQRSheet open={qrOpen} onOpenChange={setQrOpen} checkout={checkout} />
    </>
  );
};
