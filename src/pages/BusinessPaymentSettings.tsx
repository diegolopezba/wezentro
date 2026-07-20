import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { ArrowLeft, CreditCard, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";

const BusinessPaymentSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bnbAccountId, setBnbAccountId] = useState("");
  const [bnbAuthorizationId, setBnbAuthorizationId] = useState("");
  const [bnbConnected, setBnbConnected] = useState(false);
  const [savingBnb, setSavingBnb] = useState(false);
  const [showBnbAuth, setShowBnbAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useSwipeBack();

  useEffect(() => {
    if (!user) return;
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
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
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

  const handleDisconnect = async () => {
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
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-brand text-xl font-bold text-foreground">Pagos QR · BNB</h1>
          </div>
          {bnbConnected && (
            <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Conectado
            </span>
          )}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Hero card */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20" >
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">QR dinámico · Confirmación automática</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Sin intermediarios — el pago va directo a tu cuenta BNB. Escaneado por cualquier app bancaria boliviana.
            </p>
          </div>
        </m.div>

        {/* Credentials */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="py-4 px-4 rounded-xl bg-card border border-border space-y-4" >
          <h2 className="text-sm font-semibold text-foreground">Credenciales Open Banking</h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account ID</Label>
              <Input
                placeholder="Tu accountId de BNB Open Banking" value={bnbAccountId}
                onChange={(e) => setBnbAccountId(e.target.value)}
                autoComplete="off" disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Authorization ID</Label>
              <div className="relative">
                <Input
                  placeholder="Tu authorizationId de BNB" value={bnbAuthorizationId}
                  onChange={(e) => setBnbAuthorizationId(e.target.value)}
                  type={showBnbAuth ? "text" : "password"}
                  autoComplete="off" className="pr-10" disabled={loading}
                />
                <button
                  type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors" onClick={() => setShowBnbAuth(!showBnbAuth)}
                >
                  {showBnbAuth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="hero" size="sm" className="flex-1" onClick={handleSave}
              disabled={savingBnb || loading || !bnbAccountId.trim() || !bnbAuthorizationId.trim()}
            >
              {savingBnb ? "Guardando..." : bnbConnected ? "Actualizar" : "Conectar BNB"}
            </Button>
            {bnbConnected && (
              <Button
                variant="ghost" size="sm" onClick={handleDisconnect}
                disabled={savingBnb}
                className="text-destructive " >
                Desconectar
              </Button>
            )}
          </div>
        </m.div>

        {/* How to get credentials */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="py-4 px-4 rounded-xl bg-card border border-border space-y-2" >
          <h2 className="text-sm font-semibold text-foreground">¿Cómo obtener tus credenciales?</h2>
          <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Ingresa a <strong className="text-foreground">bnb.com.bo/PortalBNB/Api/OpenBanking</strong></li>
            <li>Registra tu negocio con tu cuenta BNB empresarial</li>
            <li>Recibirás tu <strong className="text-foreground">Account ID</strong> y <strong className="text-foreground">Authorization ID</strong></li>
            <li>Pégalos aquí — los pagos llegarán directo a tu cuenta</li>
          </ol>
        </m.div>

        {/* Security note */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="px-4 py-3 rounded-xl bg-muted/50 border border-border" >
          <p className="text-xs text-muted-foreground leading-relaxed">
            🔒 Tus credenciales se almacenan de forma cifrada y solo son accesibles por tu cuenta. Zentro nunca retiene ni procesa el dinero de tus transacciones.
          </p>
        </m.div>
      </div>
    </div>
  );
};

export default BusinessPaymentSettings;
