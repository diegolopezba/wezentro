import { m } from "framer-motion";
import { ArrowLeft, CreditCard, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { SALES_PAYOUTS_INTRO } from "@/components/business/featureIntroSteps";
import { BeneficiaryForm } from "@/components/business/BeneficiaryForm";

const BusinessPaymentSettings = () => {
  const navigate = useNavigate();
  const intro = useFeatureIntro("payments");
  useSwipeBack();

  return (
    <div className="light-surface min-h-[100dvh] bg-background">
      <header className="dark-island sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-4 lg:mx-auto lg:max-w-3xl lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-medium text-foreground">Pagos</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={intro.reopen} aria-label="¿Cómo funciona?">
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 lg:mx-auto lg:max-w-3xl lg:px-8">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">
              Depósitos automáticos al día siguiente
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Los pagos por tickets vendidos en Zentro se depositan automáticamente en tu cuenta
              bancaria vía Qhantuy al día hábil siguiente.
            </p>
          </div>
        </m.div>

        <BeneficiaryForm allowManage />

        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-xl bg-muted/50 border border-border"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            🔒 Tus datos bancarios se envían de forma segura a Qhantuy, nuestro procesador de pagos.
            Zentro no retiene tu dinero: Qhantuy recibe los pagos y los deposita en tu cuenta al día
            hábil siguiente.
          </p>
        </m.div>
      </div>
      <FeatureIntroSheet open={intro.open} onOpenChange={intro.setOpen} steps={SALES_PAYOUTS_INTRO} />
    </div>
  );
};

export default BusinessPaymentSettings;
