import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { resolveBusinessModules } from "@/lib/businessTypes";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";

/** Business events settings: activation toggle + event-only tools (venue layouts). */
const BusinessEvents = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  useSwipeBack();
  const modules = resolveBusinessModules(profile);
  const [saving, setSaving] = useState(false);

  const toggle = async (on: boolean) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ events_enabled: on } as any).eq("id", user.id);
    if (error) toast.error("No pudimos guardar el cambio");
    else {
      await refreshProfile();
      toast.success(on ? "Eventos activados" : "Eventos desactivados");
    }
    setSaving(false);
  };

  return (
    <div className="light-surface min-h-[100dvh] bg-background">
      <header className="dark-island sticky top-0 z-40 safe-top border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-4 lg:mx-auto lg:max-w-3xl lg:px-8">
          <Button variant="ghost" size="icon" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings/business"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Eventos</h1>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4 lg:mx-auto lg:max-w-3xl lg:px-8">
        <p className="text-[13px] leading-snug text-muted-foreground">
          Creá eventos, vendé entradas con QR, enviá invitaciones especiales y trabajá con promotores.
        </p>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="min-w-0">
            <p className="font-medium text-foreground">Eventos activos</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Activalos para ver Eventos en Crear, Gestión y el Dashboard.
            </p>
          </div>
          <Switch checked={modules.events} disabled={saving} onCheckedChange={toggle} />
        </div>

        <SettingsGroup title="Herramientas">
          <SettingsRow
            icon={LayoutGrid}
            label="Planos del lugar"
            sublabel="Mesas, lounges y secciones reutilizables para tus eventos"
            onClick={() => navigate("/settings/business/layouts")}
          />
        </SettingsGroup>
      </div>
    </div>
  );
};

export default BusinessEvents;
