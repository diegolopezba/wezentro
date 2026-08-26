import { Ticket, Lock, Star } from "lucide-react";
import type { TicketTier } from "@/hooks/useTicketTiers";

interface Props {
  tiers: TicketTier[];
  /** Tier the waiting list is attached to (gets early access when tickets drop). */
  waitlistTierId?: string | null;
  /** Copy shown under the list. */
  note?: string;
}

/**
 * Dice-style pre-sale preview: every ticket type and its price is visible while
 * the waiting list is open, but nothing is purchasable yet.
 */
export function WaitlistTiersPreview({ tiers, waitlistTierId, note }: Props) {
  if (tiers.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="font-brand text-lg font-medium text-foreground">Entradas</h2>
      <div className="rounded-2xl border border-border overflow-hidden">
        {tiers.map((t, i) => {
          const isWaitlistTier = !!waitlistTierId && t.id === waitlistTierId;
          const price = Number(t.price);
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              {isWaitlistTier ? (
                <Star className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Ticket className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{t.name}</span>
                  {isWaitlistTier && (
                    <span className="text-[10px] uppercase tracking-wide text-primary border border-primary/40 rounded-full px-1.5 py-0.5 shrink-0">
                      Lista de espera
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-foreground">
                  {price > 0 ? `Bs. ${price}` : "Gratis"}
                </span>
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {note ??
          "Las entradas aún no están a la venta. Anotate en la lista para ser de los primeros en comprar."}
      </p>
    </div>
  );
}
