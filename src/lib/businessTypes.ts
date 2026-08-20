export const FOOD_BUSINESS_TYPES = ["restaurant", "coffee", "bar"] as const;

export const isFoodBusinessType = (t?: string | null): boolean =>
  !!t && (FOOD_BUSINESS_TYPES as readonly string[]).includes(t);

/** Shared catalogue of business types (used by settings and the onboarding picker). */
export const BUSINESS_TYPES = [
  { value: "bar", label: "Bar", emoji: "🍸" },
  { value: "restaurant", label: "Restaurante", emoji: "🍽️" },
  { value: "coffee", label: "Café", emoji: "☕" },
  { value: "club", label: "Club / Discoteca", emoji: "🪩" },
  { value: "gym", label: "Gimnasio", emoji: "🏋️" },
  { value: "gallery", label: "Galería / Cultura", emoji: "🎨" },
  { value: "rooftop", label: "Rooftop", emoji: "🌆" },
  { value: "venue", label: "Venue / Salón", emoji: "🏛️" },
  { value: "other", label: "Otro", emoji: "✨" },
] as const;

export const businessTypeLabel = (t?: string | null): string =>
  BUSINESS_TYPES.find((b) => b.value === t)?.label ?? "";
