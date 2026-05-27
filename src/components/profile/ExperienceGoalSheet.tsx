import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExperienceGoalPicker } from "./ExperienceGoalPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useExperienceProgress } from "@/hooks/useExperienceProgress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Ticket, MapPin, PenLine } from "lucide-react";
import { ExperienceStatRing } from "./ExperienceStatRing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExperienceGoalSheet = ({ open, onOpenChange }: Props) => {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const existingGoal = (profile as any)?.experience_goal as number | null | undefined;
  const existingYear = (profile as any)?.experience_goal_year as number | null | undefined;
  const isStale = existingYear && existingYear !== currentYear;

  const [value, setValue] = useState<number>(existingGoal && !isStale ? existingGoal : 25);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(!existingGoal || isStale);

  const { data } = useExperienceProgress(user?.id, existingGoal, existingYear);

  useEffect(() => {
    if (open) {
      setValue(existingGoal && !isStale ? existingGoal : 25);
      setEditMode(!existingGoal || isStale);
    }
  }, [open, existingGoal, isStale]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        experience_goal: value,
        experience_goal_year: currentYear,
      } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar tu meta");
      return;
    }
    await refreshProfile();
    qc.invalidateQueries({ queryKey: ["experience-progress"] });
    toast.success("¡Meta guardada!");
    setEditMode(false);
  };

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(currentYear + 1, 0, 1).getTime() - Date.now()) / 86400000)
  );
  const daysTotal = 365;
  const elapsed = daysTotal - daysLeft;
  const suggestion = Math.max(5, Math.round((daysLeft / daysTotal) * 50));
  const hint =
    elapsed > 60
      ? `Te quedan ${daysLeft} días este año — sugerimos ~${suggestion} experiencias`
      : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="font-brand">
            {editMode ? `Tu meta para ${currentYear}` : `Meta ${currentYear}`}
          </SheetTitle>
        </SheetHeader>

        {!editMode && data && data.goal ? (
          <div className="space-y-6 pb-6">
            <div className="flex flex-col items-center py-4">
              <ExperienceStatRing percent={data.percent} pace={data.pace} size={140} />
              <p className="font-brand text-base text-foreground mt-4">
                {data.count} <span className="text-muted-foreground">/ {data.goal}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                año al {Math.round(data.yearProgressPercent)}%
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-secondary text-center">
                <Ticket className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-brand text-lg font-bold">{data.breakdown.checkIns}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Eventos</p>
              </div>
              <div className="p-3 rounded-2xl bg-secondary text-center">
                <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-brand text-lg font-bold">{data.breakdown.reservations}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lugares</p>
              </div>
              <div className="p-3 rounded-2xl bg-secondary text-center">
                <PenLine className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-brand text-lg font-bold">{data.breakdown.posts}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Posts</p>
              </div>
            </div>

            <div className="rounded-2xl bg-secondary/60 p-3 text-xs text-muted-foreground leading-relaxed">
              Cuenta cada check-in verificado a eventos, reservas confirmadas pasadas (una por lugar/día) y publicaciones que creaste este año.
            </div>

            <Button variant="outline" className="w-full rounded-full" onClick={() => setEditMode(true)}>
              Editar meta
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pb-6">
            <ExperienceGoalPicker value={value} onChange={setValue} hint={hint} />
            <div className="flex gap-2">
              {existingGoal && !isStale && (
                <Button
                  variant="secondary"
                  className="flex-1 rounded-full"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              )}
              <Button
                variant="hero"
                className="flex-1 rounded-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar meta"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
