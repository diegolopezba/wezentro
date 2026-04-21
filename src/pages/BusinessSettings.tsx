import { useState } from "react";
import { m } from "framer-motion";
import {
  ArrowLeft, Briefcase, BarChart3, ChevronRight,
  UtensilsCrossed, CalendarCheck, CreditCard, Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";

const BusinessSettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingBusiness, setTogglingBusiness] = useState(false);
  const [togglingMenu, setTogglingMenu] = useState(false);

  useSwipeBack();

  const isBusiness = profile?.is_business === true;
  const menuEnabled = (profile as any)?.menu_enabled !== false;
  const reservationsEnabled = (profile as any)?.reservations_enabled !== false;

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

  const handleToggleMenu = async (value: boolean) => {
    if (!user) return;
    setTogglingMenu(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ menu_enabled: value } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(value ? "Menú activado" : "Menú desactivado");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar configuración");
    } finally {
      setTogglingMenu(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-bold text-foreground">Business</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Business Account Toggle */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 py-4 px-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-500/20" >
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <span className="text-foreground font-semibold block">Cuenta Business</span>
            <span className="text-xs text-muted-foreground">Guestlists, dashboard, menú y reservas — gratis</span>
          </div>
          <Switch
            checked={isBusiness}
            onCheckedChange={handleToggleBusiness}
            disabled={togglingBusiness}
          />
        </m.div>

        {isBusiness && (
          <>
            {/* Dashboard Button */}
            <m.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-4 py-4 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 transition-colors" >
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-foreground font-semibold block">Business Dashboard</span>
                <span className="text-xs text-muted-foreground">Analytics e insights</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </m.button>

            {/* Section: Funciones */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4" >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                Funciones
              </h2>
            </m.div>

            {/* Información del negocio → nav */}
            <m.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              onClick={() => navigate("/settings/business/info")}
              className="w-full flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border transition-colors" >
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-foreground font-semibold block">Información del negocio</span>
                <span className="text-xs text-muted-foreground">Tipo, horarios, teléfono y dirección</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </m.button>

            {/* Menu Toggle */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border" >
              <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <span className="text-foreground font-semibold block">Menú</span>
                <span className="text-xs text-muted-foreground">Muestra tu carta en tu perfil</span>
              </div>
              <Switch
                checked={menuEnabled}
                onCheckedChange={handleToggleMenu}
                disabled={togglingMenu}
              />
            </m.div>

            {/* Reservas → nav */}
            <m.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate("/settings/business/reservations")}
              className="w-full flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border transition-colors" >
              <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-foreground font-semibold block">Reservas</span>
                <span className="text-xs text-muted-foreground">
                  {reservationsEnabled ? "Activas · configurar horario" : "Desactivadas"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </m.button>

            {/* Section: Pagos */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-4" >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                Pagos
              </h2>
            </m.div>

            {/* Pagos QR nav button */}
            <m.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              onClick={() => navigate("/settings/business/payments")}
              className="w-full flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border transition-colors" >
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-foreground font-semibold block">Pagos QR · BNB</span>
                <span className="text-xs text-muted-foreground">QR dinámico — confirmación automática sin intermediarios</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </m.button>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessSettings;
