import { m } from "framer-motion";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import {
  SUBSCRIPTION_TIERS,
  TIER_ORDER,
  formatTierPrice,
} from "@/lib/subscriptionTiers";
import {
  startSubscriptionCheckout,
  cancelSubscription,
  BILLING_CONTACT_EMAIL,
} from "@/lib/subscriptionBilling";

const BusinessPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier: currentTier, status } = useSubscriptionTier(user?.id);

  useSwipeBack();

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings/business"))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">Planes</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>
            Tu plan actual: {SUBSCRIPTION_TIERS[currentTier].name}
            {status !== "active" ? ` · ${status}` : ""}
          </span>
        </div>

        {TIER_ORDER.map((key, idx) => {
          const tier = SUBSCRIPTION_TIERS[key];
          const isCurrent = key === currentTier;
          return (
            <m.section
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-2xl border p-4 space-y-2 bg-card ${
                isCurrent ? "border-foreground" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-brand text-lg font-semibold text-foreground">{tier.name}</h2>
                <span className="text-sm text-muted-foreground">{formatTierPrice(key)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tier.tagline}</p>
              <ul className="space-y-1.5 pt-2">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 mt-[2px] shrink-0 text-muted-foreground" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? "outline" : "default"}
                disabled={isCurrent}
                className="w-full rounded-full mt-3"
                onClick={() => startSubscriptionCheckout(key)}
              >
                {isCurrent ? "Tu plan actual" : `Quiero ${tier.name}`}
              </Button>
            </m.section>
          );
        })}

        <div className="pt-2 space-y-2">
          <p className="text-[11px] text-muted-foreground text-center">
            Los planes se activan manualmente por ahora. Escríbenos a {BILLING_CONTACT_EMAIL}.
          </p>
          {currentTier !== "basico" && (
            <Button variant="ghost" className="w-full rounded-full" onClick={cancelSubscription}>
              Cambiar o cancelar plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessPlans;
