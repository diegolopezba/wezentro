import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { VenueLayoutEditor } from "@/components/venue/VenueLayoutEditor";
import { AreaListEditor } from "@/components/venue/AreaListEditor";
import { cn } from "@/lib/utils";
import {
  useVenueLayouts,
  useVenueLayoutAreas,
  useSaveVenueLayout,
  useDeleteVenueLayout,
  type DraftArea,
} from "@/hooks/useVenueLayouts";

const VenueLayouts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  useSwipeBack();

  const { data: layouts = [], isLoading } = useVenueLayouts(user?.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [areas, setAreas] = useState<DraftArea[]>([]);
  const [editorMode, setEditorMode] = useState<"canvas" | "list">("canvas");

  const { data: loadedAreas } = useVenueLayoutAreas(editingId ?? undefined);
  const save = useSaveVenueLayout();
  const del = useDeleteVenueLayout();

  useEffect(() => {
    if (editingId && loadedAreas) setAreas(loadedAreas);
  }, [editingId, loadedAreas]);

  const openNew = () => {
    setEditingId(null);
    setCreating(true);
    setName("");
    setAreas([]);
  };

  const openExisting = (id: string, layoutName: string) => {
    setCreating(true);
    setEditingId(id);
    setName(layoutName);
    setAreas([]);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Ponle un nombre al plano");
      return;
    }
    try {
      await save.mutateAsync({
        layoutId: editingId,
        businessId: user.id,
        name: name.trim(),
        areas,
      });
      toast.success("Plano guardado");
      setCreating(false);
      setEditingId(null);
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar el plano");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 safe-top bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              creating
                ? (setCreating(false), setEditingId(null))
                : window.history.length > 1
                ? navigate(-1)
                : navigate("/settings/business")
            }
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-brand text-xl font-medium text-foreground">
            {creating ? (editingId ? "Editar plano" : "Nuevo plano") : "Planos del lugar"}
          </h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-24">
        {!creating ? (
          <>
            <p className="text-sm text-muted-foreground">
              Dibuja tu espacio una vez y reutilízalo en cada evento: mesas, lounges,
              mesas largas, secciones y zonas generales.
            </p>

            {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

            {layouts.map((l) => (
              <div
                key={l.id}
                className="w-full flex items-center gap-4 py-4 px-4 rounded-xl bg-card border border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                </div>
                <button
                  type="button"
                  onClick={() => openExisting(l.id, l.name)}
                  className="flex-1 text-left"
                >
                  <span className="text-foreground font-semibold block">{l.name}</span>
                  <span className="text-xs text-muted-foreground">Tocar para editar</span>
                </button>
                <button
                  type="button"
                  aria-label="Eliminar plano"
                  onClick={async () => {
                    await del.mutateAsync(l.id);
                    toast.success("Plano eliminado");
                  }}
                  className="p-2 text-muted-foreground active:opacity-70"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {!isLoading && layouts.length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no tienes planos guardados.</p>
            )}

            <Button onClick={openNew} className="w-full rounded-full h-12">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo plano
            </Button>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Nombre del plano
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Salón principal"
              />
            </div>

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
              <VenueLayoutEditor areas={areas} onChange={setAreas} />
            ) : (
              <AreaListEditor areas={areas} onChange={setAreas} />
            )}

            <Button
              onClick={handleSave}
              disabled={save.isPending}
              className="w-full rounded-full h-12"
            >
              {save.isPending ? "Guardando…" : "Guardar plano"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VenueLayouts;
