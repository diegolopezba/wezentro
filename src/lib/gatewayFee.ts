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

export type CheckoutFeeTerms = { fee_bps?: number | null; fee_paid_by?: string | null; bps?: number | null; paidBy?: string | null };

/** Zentro service fee shown to the buyer only when the organizer passes it on. */
export function serviceFeeFor(price: number, terms?: CheckoutFeeTerms | null): number {
  const paidBy = terms?.fee_paid_by ?? terms?.paidBy;
  if (paidBy !== "buyer") return 0;
  const bps = Number(terms?.fee_bps ?? terms?.bps ?? 600) || 0;
  return Math.round((Number(price) || 0) * (bps / 10000) * 100) / 100;
}

export function chargeBreakdown(base: number, terms?: CheckoutFeeTerms | null) {
  const subtotal = Math.round((Number(base) || 0) * 100) / 100;
  const serviceFee = serviceFeeFor(subtotal, terms);
  const withService = Math.round((subtotal + serviceFee) * 100) / 100;
  const fee = gatewayFeeFor(withService);
  return { subtotal, serviceFee, fee, total: Math.round((withService + fee) * 100) / 100 };
}

export const SERVICE_FEE_LABEL = "Cargo por servicio";

export const GATEWAY_FEE_LABEL = `Comisión de procesamiento (${GATEWAY_FEE_BPS / 100}%)`;

/** Bs. formatting used across checkout summaries. */
export const formatBs = (n: number) =>
  `Bs. ${Number(n).toLocaleString("es-BO", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
