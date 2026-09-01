import { useState } from "react";
import { m } from "framer-motion";
import { ArrowLeft, HelpCircle, CalendarCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { RESERVATIONS_INTRO } from "@/components/business/featureIntroSteps";
import { TablesEditor } from "@/components/reservations/TablesEditor";
import { ReservationScheduleEditor } from "@/components/reservations/ReservationScheduleEditor";
import { ReservationRulesEditor } from "@/components/reservations/ReservationRulesEditor";
import { isFoodBusinessType } from "@/lib/businessTypes";
import { useBusinessPlanAccess } from "@/hooks/useBusinessPlanAccess";
import { PlanRequiredCard } from "@/components/subscriptions/PlanRequiredCard";


const BusinessReservations = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingReservations, setTogglingReservations] = useState(false);

  useSwipeBack();

  const isFoodBusiness = isFoodBusinessType((profile as any)?.business_type);
  const { hasActivePlan, isLoading: planLoading } = useBusinessPlanAccess(user?.id, isFoodBusiness);
  const planLocked = isFoodBusiness && !hasActivePlan && !planLoading;
  const reservationsEnabled = (profile as any)?.reservations_enabled === true && !planLocked;
  const intro = useFeatureIntro("reservations");

  const handleToggleReservations = async (value: boolean) => {
    if (!user || planLocked) return;
    setTogglingReservations(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ reservations_enabled: value } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(value ? "Reservas activadas" : "Reservas desactivadas");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar configuración");
    } finally {
      setTogglingReservations(false);
    }
  };


  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="flex-1 font-brand text-xl font-medium text-foreground">Reservas</h1>
          <button
            type="button"
            onClick={intro.reopen}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground active:opacity-60"
          >
            <HelpCircle className="h-3.5 w-3.5" /> ¿Cómo funciona?
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Toggle */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border"
        >
          <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <span className="text-foreground font-semibold block">Activar reservas</span>
            <span className="text-xs text-muted-foreground">Permite que clientes reserven mesa</span>
          </div>
          <Switch
            checked={reservationsEnabled}
            onCheckedChange={handleToggleReservations}
            disabled={togglingReservations || planLocked}
          />
        </m.div>

        {planLocked && (
          <PlanRequiredCard
            title="Activá un plan para recibir reservas"
            description="Las reservas online van con un plan mensual, sin comisión por reserva y sin permanencia."
          />
        )}

        {/* Inventory, schedules & policies — only when enabled */}
        {reservationsEnabled && user && !planLocked && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <TablesEditor businessId={user.id} />
            <ReservationScheduleEditor businessId={user.id} />
            <ReservationRulesEditor businessId={user.id} />
          </m.div>
        )}
      </div>
      <FeatureIntroSheet open={intro.open} onOpenChange={intro.setOpen} steps={RESERVATIONS_INTRO} />
    </div>
  );
};

export default BusinessReservations;
