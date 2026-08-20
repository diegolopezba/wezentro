import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PlanSelector } from "@/components/subscriptions/PlanSelector";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";
import { cancelSubscription, BILLING_CONTACT_EMAIL } from "@/lib/subscriptionBilling";

const BusinessPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier: currentTier, needsActivation, isLoading } = useSubscriptionTier(user?.id);

  useSwipeBack();

  const goBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/settings/business");

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="safe-top shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 pt-3">
        {isLoading ? null : (
        <PlanSelector
          variant="page"
          currentTier={currentTier}
          askRecommendation={needsActivation}
          subtitle={
            needsActivation
              ? "Sin plan activo · las reservas se desbloquean al activar"
              : `Tu plan actual: ${SUBSCRIPTION_TIERS[currentTier].name}`
          }
          footerSlot={
            <div className="space-y-2">
              <p className="text-center text-[11px] text-muted-foreground">
                Los planes se activan manualmente por ahora. Escribinos a {BILLING_CONTACT_EMAIL}.
              </p>
              {!needsActivation && (
                <Button
                  variant="ghost"
                  className="w-full rounded-full"
                  onClick={cancelSubscription}
                >
                  Cambiar o cancelar plan
                </Button>
              )}
            </div>
          }
        />
        )}
      </div>
    </div>
  );
};

export default BusinessPlans;
