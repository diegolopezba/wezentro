import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DraftTier {
  /** local-only identifier so React can key the row */
  key: string;
  name: string;
  price: string;
  capacity: string;
  description: string;
}

export type TicketPricingMode = "single" | "tiers";
export type TierSaleMode = "parallel" | "sequential";

interface Props {
  mode: TicketPricingMode;
  onModeChange: (m: TicketPricingMode) => void;
  singlePrice: string;
  onSinglePriceChange: (v: string) => void;
  tiers: DraftTier[];
  onTiersChange: (tiers: DraftTier[]) => void;
  saleMode: TierSaleMode;
  onSaleModeChange: (m: TierSaleMode) => void;
  /** When provided, all paid-pricing affordances are locked and trigger this callback */
  onAttemptPaidAction?: () => void;
}

const blankTier = (): DraftTier => ({
  key: crypto.randomUUID(),
  name: "",
  price: "",
  capacity: "",
  description: "",
});

export function TicketTiersEditor({
  mode,
  onModeChange,
  singlePrice,
  onSinglePriceChange,
  tiers,
  onTiersChange,
  saleMode,
  onSaleModeChange,
  onAttemptPaidAction,
}: Props) {
  const locked = Boolean(onAttemptPaidAction);
  const triggerLock = () => {
    onAttemptPaidAction?.();
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const updateTier = (key: string, patch: Partial<DraftTier>) => {
    onTiersChange(tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  };
  const removeTier = (key: string) => {
    onTiersChange(tiers.filter((t) => t.key !== key));
  };
  const addTier = () => {
    const t = blankTier();
    onTiersChange([...tiers, t]);
    setExpandedKey(t.key);
  };
  const moveTier = (idx: number, dir: -1 | 1) => {
    const next = [...tiers];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onTiersChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Mode switcher */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
        <button
          type="button"
          onClick={() => onModeChange("single")}
          className={cn(
            "flex-1 py-2 text-sm rounded-lg transition-colors",
            mode === "single" ? "bg-background text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Precio único
        </button>
        <button
          type="button"
          onClick={() => onModeChange("tiers")}
          className={cn(
            "flex-1 py-2 text-sm rounded-lg transition-colors",
            mode === "tiers" ? "bg-background text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Múltiples entradas
        </button>
      </div>

      {mode === "single" ? (
        <div className="space-y-2">
          <Label htmlFor="single-price">Precio (Bs)</Label>
          <Input
            id="single-price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0 (Gratis)"
            value={singlePrice}
            onChange={(e) => onSinglePriceChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aún no hay tipos de entrada. Añade al menos uno.
            </p>
          )}

          {tiers.map((t, idx) => {
            const expanded = expandedKey === t.key;
            return (
              <div
                key={t.key}
                className="rounded-xl border border-border bg-secondary/30 overflow-hidden"
              >
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => moveTier(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 text-muted-foreground disabled:opacity-30"
                    aria-label="Subir"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="flex-1 text-left flex items-center gap-2 min-w-0"
                    onClick={() => setExpandedKey(expanded ? null : t.key)}
                  >
                    <Ticket className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {t.name || `Entrada ${idx + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.price ? `Bs. ${t.price}` : "Sin precio"}
                        {t.capacity ? ` · ${t.capacity} cupos` : " · Ilimitado"}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTier(t.key)}
                    className="p-2 text-destructive"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {expanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        value={t.name}
                        onChange={(e) => updateTier(t.key, { name: e.target.value })}
                        placeholder="Ej. General, VIP, Early Bird"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Precio (Bs)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={t.price}
                          onChange={(e) => updateTier(t.key, { price: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cupos</Label>
                        <Input
                          type="number"
                          min="1"
                          value={t.capacity}
                          onChange={(e) => updateTier(t.key, { capacity: e.target.value })}
                          placeholder="Ilimitado"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descripción (opcional)</Label>
                      <Input
                        value={t.description}
                        onChange={(e) => updateTier(t.key, { description: e.target.value })}
                        placeholder="Ej. Acceso al área VIP"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={addTier}
          >
            <Plus className="w-4 h-4 mr-2" />
            Añadir tipo de entrada
          </Button>

          {tiers.length >= 2 && (
            <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-3">
              <div className="flex flex-col pr-3">
                <Label className="text-sm">Vender por orden</Label>
                <span className="text-xs text-muted-foreground">
                  Cada entrada se desbloquea cuando la anterior se agota
                </span>
              </div>
              <Switch
                checked={saleMode === "sequential"}
                onCheckedChange={(c) => onSaleModeChange(c ? "sequential" : "parallel")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
