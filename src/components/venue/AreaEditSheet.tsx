import { useEffect, useState } from "react";
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
import { useDirtyBaseline, saveVariant } from "@/hooks/useDirtyBaseline";
import { cn } from "@/lib/utils";

interface Props {
  area: DraftArea | null;
  onOpenChange: (open: boolean) => void;
  onSave: (area: DraftArea) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function AreaEditSheet({ area, onOpenChange, onSave, onDuplicate, onDelete }: Props) {
  const [draft, setDraft] = useState<DraftArea | null>(area);
  const { isDirty, capture } = useDirtyBaseline(draft);

  useEffect(() => {
    if (area) {
      setDraft(area);
      capture(area);
    } else {
      setDraft(null);
    }
  }, [area?.id]);

  const update = (patch: Partial<DraftArea>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = () => {
    if (!draft) return;
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Sheet open={!!area} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="light-sheet rounded-t-3xl max-h-[85dvh] overflow-hidden"
      >
        {draft && (
          <>
            <SheetHeader className="mb-4 shrink-0">
              <SheetTitle>{draft.is_decor ? "Editar elemento" : "Editar área"}</SheetTitle>
            </SheetHeader>

            <div
              data-vaul-no-drag
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-2 block">Nombre</label>
                <Input
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder={draft.is_decor ? "Escenario" : "Mesa 1"}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Forma</label>
                <div className="flex gap-2">
                  {(["rect", "circle"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update({ shape: s })}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium border",
                        (draft.shape ?? "rect") === s
                          ? "bg-foreground text-background border-foreground"
                          : "bg-secondary/50 border-border text-foreground",
                      )}
                    >
                      {s === "rect" ? "Rectángulo" : "Círculo"}
                    </button>
                  ))}
                </div>
              </div>

              {!draft.is_decor && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(AREA_TYPE_LABELS) as VenueAreaType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          update({ area_type: t, is_exclusive: AREA_TYPE_DEFAULT_EXCLUSIVE[t] })
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium border",
                          draft.area_type === t
                            ? "bg-foreground text-background border-foreground"
                            : "bg-secondary/50 border-border text-foreground",
                        )}
                      >
                        {AREA_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!draft.is_decor && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Capacidad</label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.capacity}
                      onChange={(e) =>
                        update({ capacity: Math.max(1, parseInt(e.target.value || "1", 10)) })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Precio (Bs.)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.price ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        update({ price: e.target.value === "" ? null : parseFloat(e.target.value) })
                      }
                    />
                  </div>
                </div>
              )}

              {!draft.is_decor && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Entradas incluidas
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={draft.capacity}
                    value={draft.included_tickets ?? ""}
                    placeholder="0"
                    onChange={(e) =>
                      update({
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
              )}

              {!draft.is_decor && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Área exclusiva</p>
                    <p className="text-xs text-muted-foreground">
                      {draft.is_exclusive
                        ? "Se vende completa: una reserva bloquea el área."
                        : "Capacidad compartida: varias reservas hasta llenarla."}
                    </p>
                  </div>
                  <Switch
                    checked={draft.is_exclusive}
                    onCheckedChange={(v) => update({ is_exclusive: v })}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {AREA_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update({ color: c })}
                      style={{ backgroundColor: c }}
                      className={cn(
                        "w-8 h-8 rounded-full border-2",
                        draft.color === c ? "border-foreground" : "border-transparent",
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
                  value={draft.rotation}
                  onChange={(e) => update({ rotation: parseInt(e.target.value, 10) })}
                  className="w-full"
                />
              </div>

            </div>

            <div className="shrink-0 pt-3 pb-2 space-y-2">
              <Button
                type="button"
                variant={saveVariant(isDirty)}
                disabled={!isDirty}
                onClick={handleSave}
                className="w-full rounded-full h-12"
              >
                Guardar cambios
              </Button>

              <div className="flex gap-2">
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
