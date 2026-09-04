import { useState } from "react";
import { m } from "framer-motion";
import { ArrowLeft, Plus, Sparkles, Pencil, Trash2, HelpCircle, Landmark, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useHasBeneficiary } from "@/hooks/useHasBeneficiary";
import {
  useBusinessExperiences,
  useDeleteExperience,
  useExperienceBookingsRealtime,
  type Experience,
} from "@/hooks/useExperiences";

import { ExperienceEditorSheet } from "@/components/experiences/ExperienceEditorSheet";
import { BeneficiaryRequiredSheet } from "@/components/events/BeneficiaryRequiredSheet";
import { FeatureIntroSheet, useFeatureIntro } from "@/components/business/FeatureIntroSheet";
import { EXPERIENCES_INTRO } from "@/components/business/featureIntroSteps";

/** Business hub for creating and managing bookable experiences. */
const BusinessExperiences = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  useSwipeBack();

  const experiencesEnabled = (profile as any)?.experiences_enabled === true;
  const [togglingExperiences, setTogglingExperiences] = useState(false);

  const handleToggleExperiences = async (value: boolean) => {
    if (!user) return;
    setTogglingExperiences(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ experiences_enabled: value } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(value ? "Experiencias activadas" : "Experiencias desactivadas");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar configuración");
    } finally {
      setTogglingExperiences(false);
    }
  };

  const { data: experiences = [], isLoading } = useBusinessExperiences(user?.id);
  const remove = useDeleteExperience();
  useExperienceBookingsRealtime(user?.id);
  const { hasBeneficiary } = useHasBeneficiary();

  const intro = useFeatureIntro("experiences");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [beneficiaryGate, setBeneficiaryGate] = useState(false);

  const openEditor = (exp: Experience | null) => {
    setEditing(exp);
    setEditorOpen(true);
  };

  return (
    <div className="light-surface min-h-[100dvh] bg-background">
      <header className="dark-island sticky top-0 z-40 safe-top border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-4 lg:mx-auto lg:max-w-3xl lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings/business"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 font-brand text-xl font-medium text-foreground">Experiencias</h1>
          <button
            type="button"
            onClick={intro.reopen}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground active:opacity-60"
          >
            <HelpCircle className="h-3.5 w-3.5" /> ¿Cómo funciona?
          </button>
        </div>
      </header>

      <div className="space-y-3 px-4 py-4">
        <p className="text-[13px] leading-snug text-muted-foreground">
          Creá experiencias con horarios, cupos y precios. Tus clientes reservan y pagan por adelantado
          con QR, igual que una entrada.
        </p>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="min-w-0">
            <p className="font-medium text-foreground">Experiencias activas</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Activalas para poder vincular experiencias a tus publicaciones.
            </p>
          </div>
          <Switch
            checked={experiencesEnabled}
            onCheckedChange={handleToggleExperiences}
            disabled={togglingExperiences}
          />
        </div>


        {!hasBeneficiary && (
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">Necesitás tus datos de cobro</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  Sin una cuenta bancaria registrada podés preparar tus experiencias, pero no publicarlas
                  ni cobrar las reservas.
                </p>
              </div>
            </div>
            <Button
              variant="sheet-action"
              className="mt-3 h-11 w-full rounded-full"
              onClick={() => navigate("/settings/business/payments")}
            >
              Configurar cobros
            </Button>
          </m.div>
        )}

        {isLoading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
        ) : experiences.length === 0 ? (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6 text-center"
          >
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-brand text-base font-medium text-foreground">
              Todavía no tenés experiencias
            </h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Tours, clases, buceo, catas… cualquier cosa que se reserve por horario.
            </p>
          </m.div>
        ) : (
          experiences.map((exp) => (
            <m.div
              key={exp.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{exp.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.duration_minutes} min ·{" "}
                    {exp.is_active
                      ? "Publicada"
                      : hasBeneficiary
                      ? "Oculta"
                      : "Oculta · falta configurar cobros"}
                  </p>
                </div>
                <button type="button" className="p-2 text-muted-foreground" onClick={() => openEditor(exp)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-2 text-muted-foreground"
                  onClick={() => remove.mutate(exp.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Button
                variant="outline"
                className="mt-3 h-10 w-full rounded-full text-sm"
                onClick={() => {
                  if (!hasBeneficiary) {
                    setBeneficiaryGate(true);
                    return;
                  }
                  navigate("/create", { state: { experienceId: exp.id } });
                }}
              >
                <Megaphone className="mr-1.5 h-4 w-4" /> Publicar
              </Button>
            </m.div>
          ))
        )}

        <Button
          variant="sheet-action"
          className="h-12 w-full rounded-full text-base"
          onClick={() => openEditor(null)}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nueva experiencia
        </Button>
      </div>

      {user && (
        <ExperienceEditorSheet
          open={editorOpen}
          onOpenChange={setEditorOpen}
          businessId={user.id}
          experience={editing}
          canPublish={hasBeneficiary}
          onRequirePayouts={() => setBeneficiaryGate(true)}
        />
      )}

      <BeneficiaryRequiredSheet open={beneficiaryGate} onOpenChange={setBeneficiaryGate} />
      <FeatureIntroSheet open={intro.open} onOpenChange={intro.setOpen} steps={EXPERIENCES_INTRO} />
    </div>
  );
};

export default BusinessExperiences;
