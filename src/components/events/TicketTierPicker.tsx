import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Ticket, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeTierAvailability, type TicketTier } from "@/hooks/useTicketTiers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiers: TicketTier[];
  /** True if event uses sequential (Dice-style) mode — locked tiers are hidden entirely. */
  sequential: boolean;
  onSelect: (tier: TicketTier) => void;
}

export function TicketTierPicker({ open, onOpenChange, tiers, sequential, onSelect }: Props) {
  const availability = computeTierAvailability(tiers);
  const visible = sequential ? availability.filter((a) => a.unlocked) : availability;
  const hiddenCount = availability.length - visible.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[80dvh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Elige tu entrada</SheetTitle>
        </SheetHeader>

        <div className="space-y-2 pb-6">
          {visible.map(({ tier, soldOut, remaining, unlocked }) => {
            const disabled = soldOut || !unlocked;
            return (
              <button
                key={tier.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(tier)}
                className={cn(
                  "w-full text-left rounded-2xl border border-border p-4 transition-colors",
                  disabled
                    ? "opacity-50 cursor-not-allowed bg-secondary/30"
                    : "bg-secondary/50 active:bg-secondary"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {unlocked ? (
                        <Ticket className="w-4 h-4 text-primary" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-foreground truncate">
                        {tier.name}
                      </div>
                      {tier.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {tier.description}
                        </div>
                      )}
                      <div className="mt-1 text-xs">
                        {soldOut ? (
                          <span className="text-destructive font-medium">Agotado</span>
                        ) : remaining != null && remaining <= 10 ? (
                          <span className="text-orange-500 font-medium">
                            Quedan {remaining}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Disponible</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-foreground">
                      Bs. {tier.price}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {sequential && hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              {hiddenCount === 1
                ? "1 tanda más se desbloqueará cuando esta se agote"
                : `${hiddenCount} tandas más se desbloquearán cuando esta se agote`}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
