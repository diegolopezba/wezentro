import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReport, ReportTargetType, ReportReason } from "@/hooks/useReports";
import { Loader2 } from "lucide-react";

interface ReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}

const REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam o estafa", description: "Contenido engañoso o promocional no deseado" },
  { value: "harassment", label: "Acoso o bullying", description: "Insultos, amenazas o intimidación" },
  { value: "hate_speech", label: "Discurso de odio", description: "Ataques basados en raza, género, religión, etc." },
  { value: "nudity", label: "Desnudez o contenido sexual", description: "Material sexual explícito" },
  { value: "violence", label: "Violencia o contenido gráfico", description: "Imágenes violentas o perturbadoras" },
  { value: "illegal", label: "Actividad ilegal", description: "Drogas, armas o crimen" },
  { value: "self_harm", label: "Autolesión o suicidio", description: "Contenido que promueve hacerse daño" },
  { value: "impersonation", label: "Suplantación de identidad", description: "Se hace pasar por otra persona" },
  { value: "other", label: "Otro", description: "Otra razón" },
];

export const ReportSheet = ({ open, onOpenChange, targetType, targetId }: ReportSheetProps) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const createReport = useCreateReport();

  const handleSubmit = async () => {
    if (!selectedReason) return;
    await createReport.mutateAsync({
      target_type: targetType,
      target_id: targetId,
      reason: selectedReason,
      details: details.trim() || undefined,
    });
    setSelectedReason(null);
    setDetails("");
    onOpenChange(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedReason(null);
      setDetails("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85dvh] flex flex-col rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-brand text-xl">Reportar</SheetTitle>
          <SheetDescription>
            Tu reporte es anónimo. Revisamos todo el contenido reportado en menos de 24 horas.
          </SheetDescription>
        </SheetHeader>

        <div data-vaul-no-drag className="sheet-scroll-region flex-1 mt-6 space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelectedReason(r.value)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                selectedReason === r.value
                  ? "border-primary bg-primary/10" : "border-border bg-card " }`}
            >
              <p className="text-sm font-medium text-foreground">{r.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
            </button>
          ))}
        </div>

        {selectedReason && (
          <div data-vaul-no-drag className="shrink-0 mt-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detalles adicionales (opcional)
            </label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              placeholder="Cuéntanos más sobre lo que viste..." className="mt-2 min-h-[80px]" maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{details.length}/500</p>
          </div>
        )}

        <div className="sticky bottom-0 bg-background pt-4 pb-2 mt-4">
          <Button
            variant="hero" className="w-full" disabled={!selectedReason || createReport.isPending}
            onClick={handleSubmit}
          >
            {createReport.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : ( "Enviar reporte" )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
