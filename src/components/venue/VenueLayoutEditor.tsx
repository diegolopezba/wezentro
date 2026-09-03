import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Shapes } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VenueGridCanvas } from "./VenueGridCanvas";
import { AreaEditSheet } from "./AreaEditSheet";
import {
  CANVAS_UNITS,
  makeDraftArea,
  makeDecorArea,
  DECOR_PRESETS,
  AREA_TYPE_LABELS,
  type DraftArea,
} from "@/hooks/useVenueLayouts";

interface Props {
  areas: DraftArea[];
  onChange: (areas: DraftArea[]) => void;
}

/** Shared grid builder used by the standalone layouts screen and event creation. */
export function VenueLayoutEditor({ areas, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(
    () => areas.find((a) => a.id === editingId) ?? null,
    [areas, editingId],
  );

  const updateArea = useCallback(
    (id: string, p: Partial<DraftArea>) =>
      onChange(areas.map((a) => (a.id === id ? { ...a, ...p } : a))),
    [areas, onChange],
  );

  const saveArea = useCallback(
    (updated: DraftArea) =>
      onChange(areas.map((a) => (a.id === updated.id ? updated : a))),
    [areas, onChange],
  );

  const addArea = useCallback(() => {
    const index = areas.length;
    // Lay new boxes out in a simple grid so they never land on top of each other.
    const col = index % 4;
    const row = Math.floor(index / 4);
    const next = makeDraftArea(
      {
        pos_x: Math.min(40 + col * 220, CANVAS_UNITS - 160),
        pos_y: Math.min(40 + row * 200, CANVAS_UNITS - 160),
      },
      index,
    );
    onChange([...areas, next]);
    setSelectedId(next.id);
    setEditingId(next.id);
  }, [areas, onChange]);

  const duplicate = useCallback(() => {
    if (!editing) return;
    const index = areas.length;
    const match = editing.name.match(/^(.*?)(\d+)\s*$/);
    const name = match ? `${match[1]}${parseInt(match[2], 10) + 1}` : `${editing.name} 2`;
    const copy = makeDraftArea(
      {
        ...editing,
        name,
        pos_x: Math.min(editing.pos_x + editing.width + 20, CANVAS_UNITS - editing.width),
        pos_y: editing.pos_y,
        display_order: index,
        source_layout_area_id: editing.source_layout_area_id ?? null,
      },
      index,
    );
    onChange([...areas, copy]);
    setEditingId(copy.id);
    setSelectedId(copy.id);
  }, [areas, editing, onChange]);

  const remove = useCallback(() => {
    if (!editing) return;
    onChange(areas.filter((a) => a.id !== editing.id));
    setEditingId(null);
    setSelectedId(null);
  }, [areas, editing, onChange]);

  const totalCapacity = areas.reduce((s, a) => s + (a.capacity || 0), 0);

  return (
    <div className="space-y-3">
      <VenueGridCanvas
        areas={areas}
        editable
        selectedId={selectedId}
        onSelect={(id) => {
          // First tap selects (ring highlight); tapping the already-selected
          // area opens the edit sheet. Drags never reach this callback.
          if (id && id === selectedId) {
            setEditingId(id);
          } else {
            setSelectedId(id);
          }
        }}
        onChange={updateArea}
        renderLabel={(a) =>
          `${AREA_TYPE_LABELS[a.area_type]} · ${a.capacity}p${
            a.price ? ` · Bs. ${a.price}` : ""
          }`
        }
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {areas.length} área{areas.length === 1 ? "" : "s"} · {totalCapacity} personas
        </p>
        <Button type="button" onClick={addArea} className="rounded-full h-9">
          <Plus className="w-4 h-4 mr-1" />
          Añadir área
        </Button>
      </div>

      {areas.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Añade mesas, lounges o secciones y arrástralas para dibujar tu espacio.
          Toca un área para seleccionarla y tócala de nuevo para editarla.
        </p>
      )}

      <AreaEditSheet
        area={editing}
        onOpenChange={(open) => !open && setEditingId(null)}
        onSave={saveArea}
        onDuplicate={duplicate}
        onDelete={remove}
      />
    </div>
  );
}
