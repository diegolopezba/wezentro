import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { PlanSelector } from "@/components/subscriptions/PlanSelector";
import { setBusinessIntent } from "@/lib/businessIntent";
import { haptic } from "@/lib/haptics";

/**
 * Public, read-only pricing view for the "Soy empresa" onboarding.
 * No plan can be purchased here — selecting a plan happens in
 * /settings/business/plans once the business account exists.
 */
const BusinessPlansPublic = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleCta = () => {
    haptic("medium");
    if (!user) {
      setBusinessIntent();
      navigate("/auth", { state: { mode: "signup", businessIntent: true } });
      return;
    }
    if (profile?.is_business) {
      navigate("/settings/business/plans");
      return;
    }
    navigate("/business/setup");
  };

  return (
    <div className="light-sheet flex h-[100dvh] flex-col bg-background text-foreground">
      <header className="safe-top shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Volver"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/business"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4">
        <PlanSelector
          variant="sheet"
          currentTier="basico"
          initialTier="basico"
          needsActivation
          readOnly
          ctaLabel="Crear mi cuenta Business"
          onCtaClick={handleCta}
          subtitle="Planes para restaurantes, cafés y bares · Bs. por mes"
          footerSlot={
            <div className="rounded-2xl bg-muted/70 p-4">
              <p className="text-sm font-semibold text-foreground">
                ¿Solo vendés entradas para eventos?
              </p>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                Discotecas, venues, productoras y experiencias no pagan mensualidad: solo 6% por
                entrada vendida.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default BusinessPlansPublic;
