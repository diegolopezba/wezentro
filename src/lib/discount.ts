/** Mirror of supabase/functions/_shared/discount.ts — keep both in sync. */
export type DiscountType = "percent" | "fixed";

export function computeDiscount(subtotal: number, type: DiscountType, value: number): number {
  if (!(subtotal > 0) || !(value > 0)) return 0;
  const raw = type === "percent" ? (subtotal * Math.min(value, 100)) / 100 : value;
  return Number(Math.min(raw, subtotal).toFixed(2));
}
