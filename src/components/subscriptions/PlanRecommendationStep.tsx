import { Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_TIERS, TierKey } from "@/lib/subscriptionTiers";

interface Props {
  onPick: (tier: TierKey) => void;
  onSkip: () => void;
}

const OPTIONS: { label: string; hint: string; tier: TierKey }[] = [
  { label: "Hasta 9 mesas", hint: "Locales pequeños", tier: "basico" },
  { label: "De 10 a 20 mesas", hint: "Locales medianos", tier: "profesional" },
  { label: "Más de 20 mesas", hint: "Locales grandes", tier: "elite" },
];

/** One question that pre-selects the right plan instead of making people compare alone. */
export const PlanRecommendationStep = ({ onPick, onSkip }: Props) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <h2 className="font-brand text-[28px] font-medium leading-tight text-foreground">
      ¿Cuántas mesas tenés?
    </h2>
    <p className="mt-2 text-sm text-muted-foreground">
      Te recomendamos el plan que le queda a tu local.
    </p>

    <div className="mt-5 space-y-2">
      {OPTIONS.map((o) => (
        <button
          key={o.tier}
          type="button"
          onClick={() => onPick(o.tier)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left active:opacity-70"
        >
          <Rows3 className="h-5 w-5 shrink-0 text-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">{o.label}</span>
            <span className="block text-[13px] text-muted-foreground">
              {o.hint} · Plan {SUBSCRIPTION_TIERS[o.tier].name}
            </span>
          </span>
        </button>
      ))}
    </div>

    <Button variant="ghost" className="mt-4 w-full rounded-full" onClick={onSkip}>
      Ver todos los planes
    </Button>
  </div>
);
