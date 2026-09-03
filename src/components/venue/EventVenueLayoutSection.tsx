import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";
import { VenueLayoutEditor } from "./VenueLayoutEditor";
import { AreaListEditor } from "./AreaListEditor";
import {
  useVenueLayouts,
  useVenueLayoutAreas,
  useSaveVenueLayout,
  type DraftArea,
} from "@/hooks/useVenueLayouts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  areas: DraftArea[];
  onAreasChange: (areas: DraftArea[]) => void;
}

/**
 * Optional event-creation step: draw (or reuse) the venue layout that buyers
 * will pick from. Skipping it keeps the classic ticket-tier flow untouched.
 */
export function EventVenueLayoutSection({
  businessId,
  enabled,
  onEnabledChange,
  areas,
  onAreasChange,
}: Props) {
  const { data: layouts = [] } = useVenueLayouts(businessId);
  const [pickedLayoutId, setPickedLayoutId] = useState<string | null>(null);
  const { data: templateAreas } = useVenueLayoutAreas(pickedLayoutId ?? undefined);
  const saveLayout = useSaveVenueLayout();
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editorMode, setEditorMode] = useState<"canvas" | "list">("canvas");

  const applyTemplate = (layoutId: string) => {
    setPickedLayoutId(layoutId);
  };

  // Apply the fetched template as soon as it lands.
  useEffect(() => {
    if (!pickedLayoutId || !templateAreas) return;
    onAreasChange(templateAreas.map((a, i) => ({ ...a, display_order: i })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedLayoutId, templateAreas]);


  const saveAsTemplate = async () => {
    if (areas.length === 0) return;
    setSavingTemplate(true);
    try {
      await saveLayout.mutateAsync({
        businessId,
        name: `Plano ${new Date().toLocaleDateString("es-BO")}`,
        areas,
      });
      toast.success("Plano guardado para reutilizar");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar el plano");
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <Card className="glass border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Vender por áreas</p>
            <p className="text-xs text-muted-foreground">
              Opcional · los compradores eligen su mesa o zona en el plano
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-3">
          {layouts.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Usar un plano guardado</p>
              <div className="flex flex-wrap gap-2">
                {layouts.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => applyTemplate(l.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border",
                      pickedLayoutId === l.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-secondary/50 border-border text-foreground",
                    )}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditorMode("canvas")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border",
                editorMode === "canvas"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary/50 border-border text-foreground",
              )}
            >
              Plano visual
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("list")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border",
                editorMode === "list"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary/50 border-border text-foreground",
              )}
            >
              Solo lista
            </button>
          </div>

          {editorMode === "canvas" ? (
            <VenueLayoutEditor areas={areas} onChange={onAreasChange} />
          ) : (
            <AreaListEditor areas={areas} onChange={onAreasChange} />
          )}

          {areas.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={saveAsTemplate}
              disabled={savingTemplate}
              className="w-full rounded-full h-10"
            >
              {savingTemplate ? "Guardando…" : "Guardar como plano reutilizable"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
