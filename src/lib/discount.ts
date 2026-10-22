/** Mirror of supabase/functions/_shared/discount.ts — keep both in sync. */
export type DiscountType = "percent" | "fixed";

export function computeDiscount(subtotal: number, type: DiscountType, value: number): number {
  if (!(subtotal > 0) || !(value > 0)) return 0;
  const raw = type === "percent" ? (subtotal * Math.min(value, 100)) / 100 : value;
  return Number(Math.min(raw, subtotal).toFixed(2));
}

/**
 * The code row only appears for a paid multi-ticket order on an entry the
 * organizer actually gave codes to — never on free entries, invitations or
 * venue areas, and never when the event has no usable code.
 */
export function canOfferDiscountCode(state: {
  isFree: boolean;
  canBuyMultiple: boolean;
  hasTier: boolean;
  hasCodes: boolean;
}): boolean {
  return !state.isFree && state.canBuyMultiple && state.hasTier && state.hasCodes;
}
