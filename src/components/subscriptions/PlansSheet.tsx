import { useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  SUBSCRIPTION_TIERS,
  TIER_ORDER,
  TierKey,
  formatTierPrice,
} from "@/lib/subscriptionTiers";
import { startSubscriptionCheckout } from "@/lib/subscriptionBilling";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: TierKey;
  highlightTier?: TierKey;
}

export const PlansSheet = ({ open, onOpenChange, currentTier = "basico", highlightTier }: Props) => {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl max-h-[85dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Planes para tu negocio
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pb-6 pt-2">
          {TIER_ORDER.map((key) => {
            const tier = SUBSCRIPTION_TIERS[key];
            const isCurrent = key === currentTier;
            const isHighlighted = key === highlightTier;
            return (
              <div
                key={key}
                className={`rounded-2xl border p-4 space-y-2 ${
                  isHighlighted ? "border-foreground" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-brand font-semibold text-foreground">{tier.name}</span>
                  <span className="text-xs text-muted-foreground">{formatTierPrice(key)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                <ul className="space-y-1 pt-1">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[12px] text-foreground">
                      <Check className="w-3.5 h-3.5 mt-[2px] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  className="w-full rounded-full mt-2"
                  onClick={() => startSubscriptionCheckout(key)}
                >
                  {isCurrent ? "Tu plan actual" : `Quiero ${tier.name}`}
                </Button>
              </div>
            );
          })}

          <Button
            variant="ghost"
            className="w-full rounded-full"
            onClick={() => {
              onOpenChange(false);
              navigate("/settings/business/plans");
            }}
          >
            Ver todos los detalles
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
