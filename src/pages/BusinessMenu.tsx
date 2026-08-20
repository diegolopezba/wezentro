import { useState } from "react";
import { m } from "framer-motion";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { MenuEditor } from "@/components/menu/MenuEditor";

const BusinessMenu = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [togglingMenu, setTogglingMenu] = useState(false);

  useSwipeBack();

  const menuEnabled = (profile as any)?.menu_enabled !== false;

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
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Menú</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Toggle */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border"
        >
          <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <span className="text-foreground font-semibold block">Activar menú</span>
            <span className="text-xs text-muted-foreground">Muestra tu carta en tu perfil</span>
          </div>
          <Switch
            checked={menuEnabled}
            onCheckedChange={handleToggleMenu}
            disabled={togglingMenu}
          />
        </m.div>

        {/* Editor */}
        {menuEnabled && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <MenuEditor />
          </m.div>
        )}
      </div>
    </div>
  );
};

export default BusinessMenu;
