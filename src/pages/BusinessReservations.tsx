import { useState } from "react";
import { m } from "framer-motion";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { TablesEditor } from "@/components/reservations/TablesEditor";
import { ReservationScheduleEditor } from "@/components/reservations/ReservationScheduleEditor";
import { ReservationRulesEditor } from "@/components/reservations/ReservationRulesEditor";


const BusinessReservations = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingReservations, setTogglingReservations] = useState(false);

  useSwipeBack();

  const reservationsEnabled = (profile as any)?.reservations_enabled !== false;

  const handleToggleReservations = async (value: boolean) => {
    if (!user) return;
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
          <h1 className="font-brand text-xl font-bold text-foreground">Reservas</h1>
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
            disabled={togglingReservations}
          />
        </m.div>

        {/* Inventory, schedules & policies — only when enabled */}
        {reservationsEnabled && user && (
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
    </div>
  );
};

export default BusinessReservations;
