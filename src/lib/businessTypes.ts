export const FOOD_BUSINESS_TYPES = ["restaurant", "coffee", "bar"] as const;

export const isFoodBusinessType = (t?: string | null): boolean =>
  !!t && (FOOD_BUSINESS_TYPES as readonly string[]).includes(t);
