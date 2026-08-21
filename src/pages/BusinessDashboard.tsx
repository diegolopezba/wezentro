import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Wallet, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { ContentTab } from "@/components/dashboard/ContentTab";
import { AudienceTab } from "@/components/dashboard/AudienceTab";
import { ActionsTab } from "@/components/dashboard/ActionsTab";
import { SalesTab } from "@/components/dashboard/SalesTab";
import { PromotersTab } from "@/components/dashboard/PromotersTab";
import { ReservasTab } from "@/components/dashboard/ReservasTab";
import { ComingSoonTab } from "@/components/dashboard/ComingSoonTab";
import { m } from "framer-motion";
import type { Period } from "@/components/dashboard/PeriodSelector";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { BUSINESS_DASHBOARD_INTRO } from "@/components/business/featureIntroSteps";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "sales", label: "Ventas" },
  { value: "promotores", label: "Promotores" },
  { value: "audience", label: "Audiencia" },
  { value: "content", label: "Contenido" },
  { value: "actions", label: "Acciones" },
  { value: "reservas", label: "Reservas" },
  { value: "soon", label: "Próximamente" },
];

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const intro = useFeatureIntro("dashboard");
  const [period, setPeriod] = useState<Period>("7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [openBoostWizard, setOpenBoostWizard] = useState(false);
  const { isBusiness, hasPayouts, isLoading: accessLoading } = useDashboardAccess();

  useSwipeBack();

  const handleBoostClick = () => {
    setActiveTab("actions");
    setOpenBoostWizard(true);
    // Reset after a tick so re-clicking works
    setTimeout(() => setOpenBoostWizard(false), 500);
  };

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));

  const Gate = ({
    icon: Icon,
    title,
    body,
    cta,
    to,
  }: { icon: any; title: string; body: string; cta: string; to: string }) => (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 py-4 bg-background">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Business Dashboard</h1>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-brand text-2xl font-medium text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground mb-6">{body}</p>
          <Button variant="premium" size="lg" className="w-full" onClick={() => navigate(to)}>
            {cta}
          </Button>
        </m.div>
      </div>
    </div>
  );

  if (accessLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isBusiness) {
    return (
      <Gate
        icon={BarChart3}
        title="Business Dashboard"
        body="Activa tu cuenta Business en Configuración para acceder a analíticas, métricas de eventos e insights de audiencia — es gratis."
        cta="Ir a Configuración"
        to="/settings"
      />
    );
  }

  if (!hasPayouts) {
    return (
      <Gate
        icon={Wallet}
        title="Falta configurar tus pagos"
        body="Termina de configurar tus datos de cobro para desbloquear tu dashboard con ingresos, ventas y reservas."
        cta="Configurar pagos"
        to="/settings/business/payments"
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Analytics</h1>
          {profile?.business_type && (
            <Badge variant="secondary" className="text-xs font-normal">
              {profile.business_type}
            </Badge>
          )}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        <QuickActions onBoostClick={handleBoostClick} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex w-max gap-1 bg-transparent p-0">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-secondary text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab period={period} onPeriodChange={setPeriod} />
          </TabsContent>
          <TabsContent value="sales">
            <SalesTab />
          </TabsContent>
          <TabsContent value="promotores">
            <PromotersTab />
          </TabsContent>
          <TabsContent value="audience">
            <AudienceTab />
          </TabsContent>
          <TabsContent value="content">
            <ContentTab />
          </TabsContent>
          <TabsContent value="actions">
            <ActionsTab period={period} openBoostWizard={openBoostWizard} />
          </TabsContent>
          <TabsContent value="reservas">
            <ReservasTab period={period} onPeriodChange={setPeriod} />
          </TabsContent>
          <TabsContent value="soon">
            <ComingSoonTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};


export default BusinessDashboard;
