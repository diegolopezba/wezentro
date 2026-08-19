import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { ArrowLeft, CalendarCheck, Clock, Users, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";

// Generate time options in 30-min intervals from 06:00 to 24:00
const TIME_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
});

const BusinessReservations = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingReservations, setTogglingReservations] = useState(false);
  const [savingWindow, setSavingWindow] = useState(false);

  const [reservationStartTime, setReservationStartTime] = useState("12:00");
  const [reservationEndTime, setReservationEndTime] = useState("22:00");
  const [reservationCapacity, setReservationCapacity] = useState("");

  useSwipeBack();

  const reservationsEnabled = (profile as any)?.reservations_enabled !== false;

  useEffect(() => {
    if (profile) {
      setReservationStartTime((profile as any).reservation_start_time?.slice(0, 5) || "12:00");
      setReservationEndTime((profile as any).reservation_end_time?.slice(0, 5) || "22:00");
      setReservationCapacity(
        (profile as any).reservation_capacity != null
          ? String((profile as any).reservation_capacity)
          : ""
      );
    }
  }, [profile]);

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

  const handleSaveWindow = async () => {
    if (!user) return;
    if (reservationStartTime >= reservationEndTime) {
      toast.error("La hora de inicio debe ser anterior a la hora de cierre");
      return;
    }
    setSavingWindow(true);
    try {
      const cap = parseInt(reservationCapacity);
      const { error } = await supabase
        .from("profiles")
        .update({
          reservation_start_time: reservationStartTime,
          reservation_end_time: reservationEndTime,
          reservation_capacity: isNaN(cap) || cap <= 0 ? null : cap,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Configuración de reservas guardada");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSavingWindow(false);
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
