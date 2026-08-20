import { useState } from "react";
import { m } from "framer-motion";
import { ArrowLeft, Plus, Sparkles, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import {
  useBusinessExperiences,
  useDeleteExperience,
  type Experience,
} from "@/hooks/useExperiences";
import { ExperienceEditorSheet } from "@/components/experiences/ExperienceEditorSheet";

/** Business hub for creating and managing bookable experiences. */
const BusinessExperiences = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  useSwipeBack();

  const { data: experiences = [], isLoading } = useBusinessExperiences(user?.id);
  const remove = useDeleteExperience();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);

  const openEditor = (exp: Experience | null) => {
    setEditing(exp);
    setEditorOpen(true);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 safe-top border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings/business"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">Experiencias</h1>
        </div>
      </header>

      <div className="space-y-3 px-4 py-4">
        <p className="text-[13px] leading-snug text-muted-foreground">
          Creá experiencias con horarios, cupos y precios. Tus clientes reservan y pagan por adelantado
          con QR, igual que una entrada.
        </p>

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
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{exp.title}</p>
                <p className="text-xs text-muted-foreground">
                  {exp.duration_minutes} min · {exp.is_active ? "Publicada" : "Oculta"}
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
        />
      )}
    </div>
  );
};

export default BusinessExperiences;
