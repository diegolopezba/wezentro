import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { ContentTab } from "@/components/dashboard/ContentTab";
import { AudienceTab } from "@/components/dashboard/AudienceTab";
import { ActionsTab } from "@/components/dashboard/ActionsTab";
import { motion } from "framer-motion";
import type { Period } from "@/components/dashboard/PeriodSelector";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [period, setPeriod] = useState<Period>("7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [openBoostWizard, setOpenBoostWizard] = useState(false);

  useSwipeBack();

  const handleBoostClick = () => {
    setActiveTab("actions");
    setOpenBoostWizard(true);
    // Reset after a tick so re-clicking works
    setTimeout(() => setOpenBoostWizard(false), 500);
  };

  const isBusiness = profile?.is_business === true;
  const subLoading = !profile;

  if (!subLoading && !isBusiness) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <header className="sticky top-0 z-40 safe-top">
          <div className="flex items-center gap-3 px-4 py-4 bg-background">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-brand text-xl font-bold text-foreground">Business Dashboard</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-brand text-2xl font-bold text-foreground mb-2">Business Dashboard</h2>
            <p className="text-muted-foreground mb-6">
              Activa tu cuenta Business en Configuración para acceder a analíticas, métricas de eventos e insights de audiencia — es gratis.
            </p>
            <Button variant="premium" size="lg" className="w-full" onClick={() => navigate("/settings")}>
              Ir a Configuración
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">Analytics</h1>
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
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="content" className="text-xs">Contenido</TabsTrigger>
            <TabsTrigger value="audience" className="text-xs">Audiencia</TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">Acciones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab period={period} onPeriodChange={setPeriod} />
          </TabsContent>
          <TabsContent value="content">
            <ContentTab />
          </TabsContent>
          <TabsContent value="audience">
            <AudienceTab />
          </TabsContent>
          <TabsContent value="actions">
            <ActionsTab period={period} openBoostWizard={openBoostWizard} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessDashboard;
