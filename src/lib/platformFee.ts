/**
 * Central commission rate used across the app to display the organizer's net.
 *
 * The total retained commission is 6% of the gross amount paid by the user.
 * The organizer's estimated net is the remaining 94%.
 */
export const PLATFORM_FEE_BPS = 600;

function toAmount(n: number | null | undefined): number {
  return Math.max(0, Number(n) || 0);
}

/** Estimated net payout for the organizer (gross − total commission). */
export function netOf(gross: number | null | undefined, bps = PLATFORM_FEE_BPS): number {
  const amount = toAmount(gross);
  return Math.round(amount * (1 - bps / 10000) * 100) / 100;
}

/** Total commission amount deducted from the gross. */
export function feeOf(gross: number | null | undefined, bps = PLATFORM_FEE_BPS): number {
  const amount = toAmount(gross);
  return Math.round((amount - netOf(amount, bps)) * 100) / 100;
}
