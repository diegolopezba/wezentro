import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { AreaEditSheet } from "./AreaEditSheet";
import {
  AREA_TYPE_LABELS,
  makeDraftArea,
  type DraftArea,
} from "@/hooks/useVenueLayouts";

interface Props {
  areas: DraftArea[];
  onChange: (areas: DraftArea[]) => void;
}

/**
 * Editor de áreas en modo lista (sin canvas): para negocios que solo quieren
 * vender por áreas sin dibujar el plano del lugar.
 */
export function AreaListEditor({ areas, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = areas.find((a) => a.id === editingId) ?? null;

  const patch = (id: string, p: Partial<DraftArea>) =>
    onChange(areas.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const addArea = () => {
    const draft = makeDraftArea({}, areas.length);
    onChange([...areas, draft]);
    setEditingId(draft.id);
  };

  return (
    <div className="space-y-2">
      {areas.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
        >
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: a.color }}
          />
          <button
            type="button"
            onClick={() => setEditingId(a.id)}
            className="flex-1 text-left min-w-0"
          >
            <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {AREA_TYPE_LABELS[a.area_type]} · {a.capacity} pers.
              {a.price != null && a.price > 0 ? ` · Bs. ${a.price}` : " · Gratis"}
              {(a.included_tickets ?? 0) > 0
                ? ` · incluye ${a.included_tickets} ent.`
                : ""}
            </p>
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${a.name}`}
            onClick={() => onChange(areas.filter((x) => x.id !== a.id))}
            className="p-2 text-muted-foreground active:opacity-70"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addArea}
        className="w-full rounded-full h-11"
      >
        <Plus className="w-4 h-4 mr-2" />
        Agregar área
      </Button>

      <AreaEditSheet
        area={editing}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        onChange={(p) => editing && patch(editing.id, p)}
        onDuplicate={() => {
          if (!editing) return;
          const copy = makeDraftArea(
            { ...editing, name: `${editing.name} (copia)` },
            areas.length,
          );
          onChange([...areas, copy]);
          setEditingId(copy.id);
        }}
        onDelete={() => {
          if (!editing) return;
          onChange(areas.filter((x) => x.id !== editing.id));
          setEditingId(null);
        }}
      />
    </div>
  );
}
