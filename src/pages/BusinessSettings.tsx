import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, BarChart3, ChevronRight, UtensilsCrossed, CalendarCheck, Store, CreditCard, CheckCircle2, Eye, EyeOff } from "lucide-react";
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

const BusinessSettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingBusiness, setTogglingBusiness] = useState(false);
  const [togglingMenu, setTogglingMenu] = useState(false);
  const [togglingReservations, setTogglingReservations] = useState(false);
  const [savingType, setSavingType] = useState(false);

  // BNB payment settings state
  const [bnbAccountId, setBnbAccountId] = useState("");
  const [bnbAuthorizationId, setBnbAuthorizationId] = useState("");
  const [bnbConnected, setBnbConnected] = useState(false);
  const [savingBnb, setSavingBnb] = useState(false);
  const [showBnbAuth, setShowBnbAuth] = useState(false);

  useSwipeBack();

  const isBusiness = profile?.is_business === true;
  const menuEnabled = (profile as any)?.menu_enabled !== false;
  const reservationsEnabled = (profile as any)?.reservations_enabled !== false;
  const currentBusinessType = (profile as any)?.business_type || "";

  // Load existing BNB credentials on mount
  useEffect(() => {
    if (!user || !isBusiness) return;
    supabase
      .from("business_payment_settings")
      .select("bnb_account_id, bnb_authorization_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBnbAccountId(data.bnb_account_id);
          setBnbAuthorizationId(data.bnb_authorization_id);
          setBnbConnected(true);
        }
      });
  }, [user, isBusiness]);

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

  const handleSaveBnbCredentials = async () => {
    if (!user) return;
    if (!bnbAccountId.trim() || !bnbAuthorizationId.trim()) {
      toast.error("Ingresa ambos campos de BNB");
      return;
    }
    setSavingBnb(true);
    try {
      const { error } = await supabase
        .from("business_payment_settings")
        .upsert(
          {
            user_id: user.id,
            bnb_account_id: bnbAccountId.trim(),
            bnb_authorization_id: bnbAuthorizationId.trim(),
            is_active: true,
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      setBnbConnected(true);
      toast.success("¡Credenciales BNB guardadas!");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar credenciales");
    } finally {
      setSavingBnb(false);
    }
  };

  const handleDisconnectBnb = async () => {
    if (!user) return;
    setSavingBnb(true);
    try {
      const { error } = await supabase
        .from("business_payment_settings")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      setBnbAccountId("");
      setBnbAuthorizationId("");
      setBnbConnected(false);
      toast.success("Credenciales BNB eliminadas");
    } catch (error: any) {
      toast.error(error.message || "Error al desconectar BNB");
    } finally {
      setSavingBnb(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-xl border-b border-border">
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

            {/* ── BNB Payment Settings ── */}
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="py-4 px-4 rounded-xl bg-card border border-border space-y-4"
            >
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-foreground font-semibold block">Pagos QR · BNB</span>
                  <span className="text-xs text-muted-foreground">
                    QR dinámico — confirmación automática sin intermediarios
                  </span>
                </div>
                {bnbConnected && (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Conectado
                  </span>
                )}
              </div>

              {/* Credential fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Account ID</Label>
                  <Input
                    placeholder="Tu accountId de BNB Open Banking"
                    value={bnbAccountId}
                    onChange={(e) => setBnbAccountId(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Authorization ID</Label>
                  <div className="relative">
                    <Input
                      placeholder="Tu authorizationId de BNB"
                      value={bnbAuthorizationId}
                      onChange={(e) => setBnbAuthorizationId(e.target.value)}
                      type={showBnbAuth ? "text" : "password"}
                      autoComplete="off"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowBnbAuth(!showBnbAuth)}
                    >
                      {showBnbAuth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Info note */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Registra tu negocio en <strong>bnb.com.bo/PortalBNB/Api/OpenBanking</strong> para obtener tus credenciales. Los pagos van directo a tu cuenta BNB.
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="hero"
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveBnbCredentials}
                  disabled={savingBnb || !bnbAccountId.trim() || !bnbAuthorizationId.trim()}
                >
                  {savingBnb ? "Guardando..." : bnbConnected ? "Actualizar" : "Conectar BNB"}
                </Button>
                {bnbConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectBnb}
                    disabled={savingBnb}
                    className="text-destructive hover:text-destructive"
                  >
                    Desconectar
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessSettings;
