import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_TIERS, TierKey, formatTierPrice } from "@/lib/subscriptionTiers";
import { BILLING_CONTACT_EMAIL, startSubscriptionCheckout } from "@/lib/subscriptionBilling";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: TierKey;
}

/** Final confirmation step: plan summary, what unlocks, and how activation works today. */
export const PlanConfirmSheet = ({ open, onOpenChange, tier }: Props) => {
  const config = SUBSCRIPTION_TIERS[tier];

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(BILLING_CONTACT_EMAIL);
      toast.success("Email copiado");
    } catch {
      toast.error("No pudimos copiar el email");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-0">
        <SheetTitle className="sr-only">Confirmar plan {config.name}</SheetTitle>

        <h2 className="font-brand text-[26px] font-medium leading-tight text-foreground">
          Plan {config.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatTierPrice(tier)} · {config.sizeLabel}
        </p>

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
            Por ahora activamos los planes a mano. Escribinos y lo dejamos listo el mismo día.
          </p>
          <button
            type="button"
            onClick={copyEmail}
            className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            {BILLING_CONTACT_EMAIL}
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 pb-[max(env(safe-area-inset-bottom),12px)]">
          <Button
            variant="sheet-action"
            className="h-12 w-full rounded-full text-base"
            onClick={() => {
              startSubscriptionCheckout(tier);
              onOpenChange(false);
            }}
          >
            Quiero {config.name}
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
  );
};
