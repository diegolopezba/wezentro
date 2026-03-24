import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, BarChart3, ChevronRight, UtensilsCrossed, CalendarCheck, Store, CreditCard, Clock, Phone, Save, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";

const BUSINESS_TYPES = [
  { value: "bar", label: "Bar", emoji: "🍸" },
  { value: "restaurant", label: "Restaurante", emoji: "🍽️" },
  { value: "coffee", label: "Café", emoji: "☕" },
  { value: "club", label: "Club / Discoteca", emoji: "🪩" },
  { value: "gym", label: "Gimnasio", emoji: "🏋️" },
  { value: "gallery", label: "Galería / Cultura", emoji: "🎨" },
  { value: "rooftop", label: "Rooftop", emoji: "🌆" },
  { value: "venue", label: "Venue / Salón", emoji: "🏛️" },
  { value: "other", label: "Otro", emoji: "✨" },
];

// Generate time options in 30-min intervals from 06:00 to 24:00
const TIME_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
});

const BusinessSettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingBusiness, setTogglingBusiness] = useState(false);
  const [togglingMenu, setTogglingMenu] = useState(false);
  const [togglingReservations, setTogglingReservations] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingReservationWindow, setSavingReservationWindow] = useState(false);

  // Business info form state
  const [businessHours, setBusinessHours] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");

  // Reservation window state
  const [reservationStartTime, setReservationStartTime] = useState("12:00");
  const [reservationEndTime, setReservationEndTime] = useState("22:00");
  const [reservationCapacity, setReservationCapacity] = useState("");

  useSwipeBack();

  const isBusiness = profile?.is_business === true;
  const menuEnabled = (profile as any)?.menu_enabled !== false;
  const reservationsEnabled = (profile as any)?.reservations_enabled !== false;
  const currentBusinessType = (profile as any)?.business_type || "";

  // Sync local state when profile loads
  useEffect(() => {
    if (profile) {
      setBusinessHours((profile as any).business_hours || "");
      setBusinessPhone((profile as any).business_phone || "");
      setReservationStartTime((profile as any).reservation_start_time?.slice(0, 5) || "12:00");
      setReservationEndTime((profile as any).reservation_end_time?.slice(0, 5) || "22:00");
      setReservationCapacity(
        (profile as any).reservation_capacity != null
          ? String((profile as any).reservation_capacity)
          : ""
      );
    }
  }, [profile]);

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

  const handleBusinessTypeChange = async (value: string) => {
    if (!user) return;
    setSavingType(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ business_type: value } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Tipo de negocio actualizado");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar tipo de negocio");
    } finally {
      setSavingType(false);
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

  const handleSaveBusinessInfo = async () => {
    if (!user) return;
    setSavingInfo(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_hours: businessHours.trim() || null,
          business_phone: businessPhone.trim() || null,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Información del negocio guardada");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveReservationWindow = async () => {
    if (!user) return;
    if (reservationStartTime >= reservationEndTime) {
      toast.error("La hora de inicio debe ser anterior a la hora de cierre");
      return;
    }
    setSavingReservationWindow(true);
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
      toast.success("Horario de reservas guardado");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSavingReservationWindow(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 py-4 px-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-500/20"
        >
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
        </motion.div>

        {/* Business Type Picker */}
        {isBusiness && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="py-4 px-4 rounded-xl bg-card border border-border space-y-2"
          >
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-muted-foreground" />
              <Label className="text-foreground font-semibold">Tipo de negocio</Label>
            </div>
            <Select
              value={currentBusinessType}
              onValueChange={handleBusinessTypeChange}
              disabled={savingType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu tipo de negocio" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.emoji}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* Business Info Section */}
        {isBusiness && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="py-4 px-4 rounded-xl bg-card border border-border space-y-4"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label className="text-foreground font-semibold">Información del negocio</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-hours" className="text-sm text-muted-foreground">Horarios de atención</Label>
              <Textarea
                id="business-hours"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder={"Ej: Lun-Vie: 9:00-18:00\nSab: 10:00-14:00"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Esta información se muestra en el perfil para los visitantes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-phone" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /> Teléfono de contacto
              </Label>
              <Input
                id="business-phone"
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+591 70000000"
              />
            </div>

            <Button
              size="sm"
              onClick={handleSaveBusinessInfo}
              disabled={savingInfo}
              className="w-full"
            >
              {savingInfo ? "Guardando..." : (
                <><Save className="w-4 h-4 mr-2" />Guardar información</>
              )}
            </Button>
          </motion.div>
        )}

        {/* Dashboard Button */}
        {isBusiness && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-4 py-4 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:from-primary/15 hover:to-primary/10 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-foreground font-semibold block">Business Dashboard</span>
              <span className="text-xs text-muted-foreground">Analytics e insights</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}

        {/* Feature Toggles - only show when business is enabled */}
        {isBusiness && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-4"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                Funciones
              </h2>
            </motion.div>

            {/* Menu Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border"
            >
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
            </motion.div>

            {/* Reservations Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border"
            >
              <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <span className="text-foreground font-semibold block">Reservas</span>
                <span className="text-xs text-muted-foreground">Permite que clientes reserven mesa</span>
              </div>
              <Switch
                checked={reservationsEnabled}
                onCheckedChange={handleToggleReservations}
                disabled={togglingReservations}
              />
            </motion.div>

            {/* Reservation Time Window - only when reservations enabled */}
            {reservationsEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="py-4 px-4 rounded-xl bg-card border border-border space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <Label className="text-foreground font-semibold">Horario de reservas</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Solo se podrán reservar mesas en el rango de horas que definas aquí.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Desde</Label>
                    <Select value={reservationStartTime} onValueChange={setReservationStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-52">
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                    <Select value={reservationEndTime} onValueChange={setReservationEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-52">
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="res-capacity" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" /> Capacidad por horario (personas)
                  </Label>
                  <Input
                    id="res-capacity"
                    type="number"
                    min={1}
                    value={reservationCapacity}
                    onChange={(e) => setReservationCapacity(e.target.value)}
                    placeholder="Ej: 50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo de personas que pueden reservar en un mismo horario.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleSaveReservationWindow}
                  disabled={savingReservationWindow}
                  className="w-full"
                >
                  {savingReservationWindow ? "Guardando..." : (
                    <><Save className="w-4 h-4 mr-2" />Guardar horario</>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Pagos section header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                Pagos
              </h2>
            </motion.div>

            {/* Pagos QR nav button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={() => navigate("/settings/business/payments")}
              className="w-full flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-foreground font-semibold block">Pagos QR · BNB</span>
                <span className="text-xs text-muted-foreground">QR dinámico — confirmación automática sin intermediarios</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessSettings;
