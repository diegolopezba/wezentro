import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Copy, Trash2 } from "lucide-react";
import {
  AREA_COLORS,
  AREA_TYPE_DEFAULT_EXCLUSIVE,
  AREA_TYPE_LABELS,
  type DraftArea,
  type VenueAreaType,
} from "@/hooks/useVenueLayouts";
import { cn } from "@/lib/utils";

interface Props {
  area: DraftArea | null;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<DraftArea>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function AreaEditSheet({ area, onOpenChange, onChange, onDuplicate, onDelete }: Props) {
  return (
    <Sheet open={!!area} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl max-h-[85dvh] overflow-y-auto"
      >
        {area && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>Editar área</SheetTitle>
            </SheetHeader>

            <div className="space-y-4 pb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Nombre</label>
                <Input
                  value={area.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="Mesa 1"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(AREA_TYPE_LABELS) as VenueAreaType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        onChange({ area_type: t, is_exclusive: AREA_TYPE_DEFAULT_EXCLUSIVE[t] })
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium border",
                        area.area_type === t
                          ? "bg-foreground text-background border-foreground"
                          : "bg-secondary/50 border-border text-foreground",
                      )}
                    >
                      {AREA_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Capacidad</label>
                  <Input
                    type="number"
                    min={1}
                    value={area.capacity}
                    onChange={(e) =>
                      onChange({ capacity: Math.max(1, parseInt(e.target.value || "1", 10)) })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Precio (Bs.)</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={area.price ?? ""}
                    placeholder="0"
                    onChange={(e) =>
                      onChange({ price: e.target.value === "" ? null : parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Entradas incluidas
                </label>
                <Input
                  type="number"
                  min={0}
                  max={area.capacity}
                  value={area.included_tickets ?? ""}
                  placeholder="0"
                  onChange={(e) =>
                    onChange({
                      included_tickets:
                        e.target.value === ""
                          ? null
                          : Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Entradas al evento incluidas con la reserva de esta área. 0 = sin entradas incluidas.
                </p>
              </div>


              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Área exclusiva</p>
                  <p className="text-xs text-muted-foreground">
                    {area.is_exclusive
                      ? "Se vende completa: una reserva bloquea el área."
                      : "Capacidad compartida: varias reservas hasta llenarla."}
                  </p>
                </div>
                <Switch
                  checked={area.is_exclusive}
                  onCheckedChange={(v) => onChange({ is_exclusive: v })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {AREA_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChange({ color: c })}
                      style={{ backgroundColor: c }}
                      className={cn(
                        "w-8 h-8 rounded-full border-2",
                        area.color === c ? "border-foreground" : "border-transparent",
                      )}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Rotación</label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={15}
                  value={area.rotation}
                  onChange={(e) => onChange({ rotation: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={onDuplicate}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-full text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
