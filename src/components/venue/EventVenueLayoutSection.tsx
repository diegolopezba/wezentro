import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { LayoutGrid, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useVenueLayouts,
  useVenueLayoutAreas,
  type DraftArea,
} from "@/hooks/useVenueLayouts";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  areas: DraftArea[];
  onAreasChange: (areas: DraftArea[]) => void;
}

/**
 * Optional event step: pick one of the venue layouts already saved in
 * Ajustes > Planos del lugar. Areas can only be created/edited there,
 * never inline while creating an event.
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

  // Clear the visual selection whenever the section is turned off, so the
  // chips never look selected while no areas are loaded.
  useEffect(() => {
    if (!enabled) setPickedLayoutId(null);
  }, [enabled]);

  // Apply the fetched layout as soon as it lands.
  useEffect(() => {
    if (!enabled || !pickedLayoutId || !templateAreas) return;
    onAreasChange(templateAreas.map((a, i) => ({ ...a, display_order: i })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pickedLayoutId, templateAreas]);

  const pickLayout = (id: string) => {
    setPickedLayoutId(id);
    // Re-clicking the same chip must still (re)apply its areas.
    if (id === pickedLayoutId && templateAreas) {
      onAreasChange(templateAreas.map((a, i) => ({ ...a, display_order: i })));
    }
  };

  const bookable = areas.filter((a) => !a.is_decor);

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
              Opcional · usa un plano guardado para vender mesas o zonas
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-3">
          {layouts.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">Elige un plano guardado</p>
              <div className="flex flex-wrap gap-2">
                {layouts.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => pickLayout(l.id)}
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
              {areas.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {bookable.length} área{bookable.length === 1 ? "" : "s"} ·{" "}
                  {bookable.reduce((s, a) => s + (a.capacity || 0), 0)} personas
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Todavía no tienes planos guardados.
            </p>
          )}

          <Link
            to="/settings/business/layouts"
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-4"
          >
            Administrar planos del lugar
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </Card>
  );
}
