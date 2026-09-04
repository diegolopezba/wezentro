import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PlanSelector } from "@/components/subscriptions/PlanSelector";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";
import { cancelSubscription } from "@/lib/subscriptionBilling";

const dateLabel = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-BO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

const BusinessPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tier: currentTier,
    needsActivation,
    isLoading,
    inGracePeriod,
    graceUntil,
    renewsOn,
    billingInterval,
  } = useSubscriptionTier(user?.id);

  useSwipeBack();

  const goBack = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/settings/business");

  const subtitle = needsActivation
    ? "Sin plan activo · las reservas se desbloquean al activar"
    : inGracePeriod
      ? `Tu plan venció · renová antes del ${dateLabel(graceUntil) ?? "fin del período de gracia"}`
      : `Plan ${SUBSCRIPTION_TIERS[currentTier].name}${
          renewsOn ? ` · se renueva el ${dateLabel(renewsOn)}` : ""
        }`;

  return (
    <div className="light-surface flex h-[100dvh] flex-col bg-background">
      <header className="dark-island safe-top shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3 lg:mx-auto lg:max-w-3xl lg:px-8">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 pt-3 lg:w-full lg:mx-auto lg:max-w-5xl lg:px-8">
        {isLoading ? null : (
          <PlanSelector
            variant="page"
            currentTier={currentTier}
            askRecommendation={needsActivation}
            needsActivation={needsActivation}
            subtitle={subtitle}
            footerSlot={
              <div className="space-y-2">
                <p className="text-center text-[11px] text-muted-foreground">
                  Pagás con QR desde tu banco. Sin débito automático: te avisamos 3 días antes
                  de cada renovación
                  {billingInterval === "year" ? " anual" : " mensual"}.
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
