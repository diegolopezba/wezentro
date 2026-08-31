// Server-side source of truth for plan pricing. Mirrors src/lib/subscriptionTiers.ts.
// Prices are in Bolivianos (BOB).

export type TierKey = "basico" | "profesional" | "elite";
export type BillingInterval = "month" | "year";

export const TIER_NAMES: Record<TierKey, string> = {
  basico: "Básico",
  profesional: "Profesional",
  elite: "Premium",
};

export const TIER_MONTHLY_PRICE: Record<TierKey, number> = {
  basico: 250,
  profesional: 300,
  elite: 500,
};

/** Paying 12 months up front saves 5%. */
export const YEARLY_DISCOUNT = 0.05;

export const isTierKey = (v: unknown): v is TierKey =>
  v === "basico" || v === "profesional" || v === "elite";

export const isInterval = (v: unknown): v is BillingInterval =>
  v === "month" || v === "year";

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Full price for one billing cycle. */
export const cyclePrice = (tier: TierKey, interval: BillingInterval): number => {
  const monthly = TIER_MONTHLY_PRICE[tier];
  return interval === "year"
    ? round2(monthly * 12 * (1 - YEARLY_DISCOUNT))
    : round2(monthly);
};

export interface ChargeQuote {
  amount: number;
  prorated: boolean;
  /** Human explanation shown in the checkout sheet. */
  label: string;
}

/**
 * Amount to charge now.
 * Mid-cycle upgrade on a monthly plan -> only the difference for the days left,
 * keeping the same renewal date. Everything else -> one full cycle.
 */
export const quoteCharge = (params: {
  tier: TierKey;
  interval: BillingInterval;
  currentTier?: TierKey | null;
  currentStatus?: string | null;
  currentInterval?: BillingInterval | null;
  periodEnd?: string | null;
}): ChargeQuote => {
  const { tier, interval, currentTier, currentStatus, currentInterval, periodEnd } = params;
  const full = cyclePrice(tier, interval);

  const isActive = currentStatus === "active" || currentStatus === "past_due";
  const endMs = periodEnd ? new Date(periodEnd).getTime() : NaN;
  const msLeft = Number.isFinite(endMs) ? endMs - Date.now() : 0;

  const isUpgrade =
    !!currentTier &&
    TIER_MONTHLY_PRICE[tier] > TIER_MONTHLY_PRICE[currentTier];

  if (
    isActive &&
    isUpgrade &&
    msLeft > 0 &&
    interval === (currentInterval ?? "month")
  ) {
    const cycleMs = (currentInterval === "year" ? 365 : 30) * 24 * 3600_000;
    const ratio = Math.min(msLeft / cycleMs, 1);
    const diff = cyclePrice(tier, interval) - cyclePrice(currentTier!, interval);
    const amount = Math.max(round2(diff * ratio), 1);
    const days = Math.max(Math.ceil(msLeft / (24 * 3600_000)), 1);
    return {
      amount,
      prorated: true,
      label: `Diferencia por los ${days} días que quedan de tu ciclo actual`,
    };
  }

  return {
    amount: full,
    prorated: false,
    label:
      interval === "year"
        ? "12 meses por adelantado (5% de descuento)"
        : "1 mes de servicio",
  };
};
