/**
 * Qhantuy charges its commission out of the amount collected, but Zentro's
 * split already distributes 100% of the base price (94% organizer / 6% Zentro).
 * So the gateway commission is charged PRE_CHARGE: added on top of the price
 * and paid by the buyer. Keep in sync with `supabase/functions/_shared/qhantuy.ts`.
 */
export const GATEWAY_FEE_BPS = 100;

const ceil2 = (n: number) => Math.ceil(Number((n * 100).toFixed(4))) / 100;

export function gatewayFeeFor(base: number): number {
  const amount = Number(base) || 0;
  if (amount <= 0 || GATEWAY_FEE_BPS <= 0) return 0;
  const r = GATEWAY_FEE_BPS / 10000;
  return ceil2((amount * r) / (1 - r));
}

export function chargeBreakdown(base: number) {
  const subtotal = Math.round((Number(base) || 0) * 100) / 100;
  const fee = gatewayFeeFor(subtotal);
  return { subtotal, fee, total: Math.round((subtotal + fee) * 100) / 100 };
}

export const GATEWAY_FEE_LABEL = `Comisión de procesamiento (${GATEWAY_FEE_BPS / 100}%)`;

/** Bs. formatting used across checkout summaries. */
export const formatBs = (n: number) =>
  `Bs. ${Number(n).toLocaleString("es-BO", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
