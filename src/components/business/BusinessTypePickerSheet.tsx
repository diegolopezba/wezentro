import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPES, isFoodBusinessType } from "@/lib/businessTypes";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: string;
  /** Persists the type; the caller decides what happens next. */
  onSelect: (type: string, isFood: boolean) => void | Promise<void>;
  isSaving?: boolean;
}

/**
 * Large-card business type picker shown right after activating the account.
 * The choice decides the branch: food businesses go to plans, the rest stay free.
 */
export const BusinessTypePickerSheet = ({
  open,
  onOpenChange,
  initialType,
  onSelect,
  isSaving,
}: Props) => {
  const [type, setType] = useState<string>(initialType ?? "");
  const isFood = isFoodBusinessType(type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="light-sheet rounded-t-3xl pb-0">
        <SheetTitle className="sr-only">Tipo de negocio</SheetTitle>

        <h2 className="font-brand text-[26px] font-medium leading-tight text-foreground">
          ¿Qué tipo de negocio tenés?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Con esto sabemos qué herramientas mostrarte.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {BUSINESS_TYPES.map((t) => {
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border p-3.5 text-left transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/50 text-foreground",
                )}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>

        {type && (
          <p className="mt-4 rounded-2xl bg-muted/60 p-4 text-[13px] leading-snug text-muted-foreground">
            {isFood
              ? `Reservas y menú van con un plan desde Bs. ${SUBSCRIPTION_TIERS.basico.price_bob}/mes. Sin comisión por reserva.`
              : "Tu cuenta Business es gratis: ganás vendiendo entradas y con posts patrocinados."}
          </p>
        )}

        <div className="mt-5 pb-[max(env(safe-area-inset-bottom),12px)]">
          <Button
            variant="sheet-action"
            className="h-12 w-full rounded-full text-base"
            disabled={!type || isSaving}
            onClick={() => onSelect(type, isFood)}
          >
            Continuar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
