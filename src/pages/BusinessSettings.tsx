import { useEffect, useState } from "react";
import { m } from "framer-motion";
import {
  ArrowLeft, Briefcase, BarChart3,
  UtensilsCrossed, CalendarCheck, CreditCard, Info, TrendingUp, LayoutGrid, Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { isFoodBusinessType } from "@/lib/businessTypes";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";
import { useDashboardAccess } from "@/hooks/useDashboardAccess";
import { BusinessIntroSheet } from "@/components/business/BusinessIntroSheet";
import { BusinessTypePickerSheet } from "@/components/business/BusinessTypePickerSheet";
import { BusinessSetupChecklist, SetupStep } from "@/components/business/BusinessSetupChecklist";
import { useBusinessPlanAccess } from "@/hooks/useBusinessPlanAccess";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";

const BusinessSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingBusiness, setTogglingBusiness] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [savingType, setSavingType] = useState(false);

  useSwipeBack();

  const isBusiness = profile?.is_business === true;
  const showVenueLayouts = false; // Hidden until venue layout feature is more developed
  const menuEnabled = (profile as any)?.menu_enabled === true;
  const reservationsEnabled = (profile as any)?.reservations_enabled === true;
  const experiencesEnabled = (profile as any)?.experiences_enabled === true;
  const isFoodBusiness = isBusiness && isFoodBusinessType((profile as any)?.business_type);
  const { tier } = useSubscriptionTier(isFoodBusiness ? user?.id : undefined);
  const { hasActivePlan } = useBusinessPlanAccess(user?.id, isFoodBusiness);
  const planLocked = isFoodBusiness && !hasActivePlan;
  const { hasPayouts } = useDashboardAccess();
  const businessType = (profile as any)?.business_type as string | undefined;

  const setupSteps: SetupStep[] = isBusiness
    ? [
        {
          key: "type",
          label: "Elegí tu tipo de negocio",
          hint: "Define qué herramientas ves",
          done: !!businessType,
          onClick: () => setTypePickerOpen(true),
        },
        {
          key: "info",
          label: "Completá tu información",
          hint: "Dirección, horarios y teléfono",
          done: !!(profile as any)?.business_address,
          onClick: () => navigate("/settings/business/info"),
        },
        ...(isFoodBusiness
          ? [
              {
                key: "plan",
                label: "Activá tu plan",
                hint: `Desde Bs. ${SUBSCRIPTION_TIERS.basico.price_bob}/mes · desbloquea reservas`,
                done: !needsActivation,
                onClick: () => navigate("/settings/business/plans"),
              } as SetupStep,
            ]
          : []),
        {
          key: "payments",
          label: "Configurá tus pagos",
          hint: "Para recibir el dinero de tus entradas",
          done: !!hasPayouts,
          onClick: () => navigate("/settings/business/payments"),
        },
      ]
    : [];

  useEffect(() => {
    if ((location.state as any)?.intro && profile?.is_business !== true) {
      setIntroOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state, profile?.is_business]);

  const activateBusiness = async () => {
    await handleToggleBusiness(true);
    setIntroOpen(false);
    setTypePickerOpen(true);
  };

  const saveBusinessType = async (value: string, isFood: boolean) => {
    if (!user) return;
    setSavingType(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ business_type: value, is_food_business: isFood } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setTypePickerOpen(false);
      if (isFood) navigate("/settings/business/plans");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el tipo de negocio");
    } finally {
      setSavingType(false);
    }
  };

  const handleToggleBusiness = async (value: boolean) => {
    if (!user) return;
    setTogglingBusiness(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_business: value })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(value ? "¡Cuenta Business activada!" : "Cuenta Business desactivada");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar tipo de cuenta");
    } finally {
      setTogglingBusiness(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Business</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Business Account Toggle */}
        <SettingsGroup>
          <SettingsRow
            icon={Briefcase}
            label="Cuenta Business"
            sublabel="Guestlists, dashboard, menú y reservas"
            right={
              <Switch
                checked={isBusiness}
                onCheckedChange={(v) => (v ? setIntroOpen(true) : handleToggleBusiness(false))}
                disabled={togglingBusiness}
              />
            }
          />
        </SettingsGroup>

        {isBusiness && (
          <>
            <BusinessSetupChecklist steps={setupSteps} />

            <SettingsGroup>
              <SettingsRow
                icon={BarChart3}
                label="Business Dashboard"
                sublabel="Analíticas y perspectivas"
                onClick={() => navigate("/dashboard")}
                delay={0.03}
              />
            </SettingsGroup>

            <SettingsGroup title="Funciones">
              <SettingsRow
                icon={Info}
                label="Información del negocio"
                sublabel="Tipo, horarios, teléfono y dirección"
                onClick={() => navigate("/settings/business/info")}
                delay={0.06}
              />
              <SettingsRow
                icon={UtensilsCrossed}
                label="Menú"
                sublabel={
                  planLocked
                    ? "Requiere un plan activo"
                    : menuEnabled
                      ? "Activo · editar carta"
                      : "Desactivado"
                }
                onClick={() => navigate("/settings/business/menu")}
                delay={0.09}
              />
              <SettingsRow
                icon={CalendarCheck}
                label="Reservas"
                sublabel={
                  planLocked
                    ? "Requiere un plan activo"
                    : reservationsEnabled
                      ? "Activas · configurar horario"
                      : "Desactivadas"
                }
                onClick={() => navigate("/settings/business/reservations")}
                delay={0.12}
              />
              <SettingsRow
                icon={Sparkles}
                label="Experiencias"
                sublabel={
                  experiencesEnabled
                    ? "Activas · tours, clases y actividades"
                    : hasPayouts
                      ? "Desactivadas"
                      : "Requiere datos bancarios"
                }
                onClick={() => navigate("/settings/business/experiences")}
                delay={0.14}
              />
              <SettingsRow
                icon={TrendingUp}
                label="Ventas y promotores"
                sublabel="Ingresos, entradas vendidas y rendimiento de promotores"
                onClick={() => navigate("/settings/business/sales")}
                delay={0.15}
              />
              {isFoodBusiness && (
                <SettingsRow
                  icon={Sparkles}
                  label="Plan y facturación"
                  sublabel={`Plan actual: ${SUBSCRIPTION_TIERS[tier].name}`}
                  onClick={() => navigate("/settings/business/plans")}
                  delay={0.18}
                />
              )}
              {showVenueLayouts && (
                <SettingsRow
                  icon={LayoutGrid}
                  label="Planos del lugar"
                  sublabel="Mesas, lounges y secciones reutilizables para tus eventos"
                  onClick={() => navigate("/settings/business/layouts")}
                  delay={0.21}
                />
              )}
            </SettingsGroup>

            <SettingsGroup title="Pagos">
              <SettingsRow
                icon={CreditCard}
                label="Pagos"
                sublabel="Depósitos automáticos a tu cuenta bancaria al día siguiente"
                onClick={() => navigate("/settings/business/payments")}
                delay={0.24}
              />
            </SettingsGroup>
          </>
        )}
      </div>

      <BusinessIntroSheet
        open={introOpen}
        onOpenChange={setIntroOpen}
        onActivate={activateBusiness}
        isActivating={togglingBusiness}
      />
      <BusinessTypePickerSheet
        requireChoice
        open={typePickerOpen}
        onOpenChange={setTypePickerOpen}
        initialType={businessType}
        onSelect={saveBusinessType}
        isSaving={savingType}
      />
    </div>
  );
};

export default BusinessSettings;
