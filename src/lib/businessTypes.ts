export const FOOD_BUSINESS_TYPES = ["restaurant", "coffee", "bar"] as const;

export const isFoodBusinessType = (t?: string | null): boolean =>
  !!t && (FOOD_BUSINESS_TYPES as readonly string[]).includes(t);

export type BusinessCategory = "gastronomy" | "events" | "experiences";

/** The three top-level business categories shown in onboarding. */
export const BUSINESS_CATEGORIES: {
  id: BusinessCategory;
  label: string;
  types: { value: string; label: string; emoji: string }[];
}[] = [
  {
    id: "gastronomy",
    label: "Gastronomía",
    types: [
      { value: "restaurant", label: "Restaurante", emoji: "🍽️" },
      { value: "bar", label: "Bar", emoji: "🍸" },
      { value: "coffee", label: "Café", emoji: "☕" },
    ],
  },
  {
    id: "events",
    label: "Eventos",
    types: [
      { value: "club", label: "Boliche / Nightclub", emoji: "🪩" },
      { value: "concert", label: "Conciertos", emoji: "🎤" },
      { value: "festival", label: "Festivales", emoji: "🎪" },
      { value: "party", label: "Fiestas y eventos", emoji: "🎉" },
      { value: "gallery", label: "Arte y cultura", emoji: "🎨" },
    ],
  },
  {
    id: "experiences",
    label: "Experiencias",
    types: [
      { value: "adventure", label: "Aventura", emoji: "🏔️" },
      { value: "extreme", label: "Deportes extremos", emoji: "🪂" },
      { value: "tour", label: "Tours y paseos", emoji: "🧭" },
    ],
  },
];

/** Hidden legacy types still resolvable for older accounts. */
const LEGACY_TYPES = [
  { value: "gym", label: "Gimnasio", emoji: "🏋️", category: "experiences" as const },
  { value: "rooftop", label: "Rooftop", emoji: "🌆", category: "events" as const },
  { value: "venue", label: "Venue / Salón", emoji: "🏛️", category: "events" as const },
  { value: "other", label: "Otro", emoji: "✨", category: "events" as const },
];

/** Flat catalogue of selectable types (onboarding + settings). */
export const BUSINESS_TYPES = BUSINESS_CATEGORIES.flatMap((c) => c.types);

export const businessTypeLabel = (t?: string | null): string =>
  BUSINESS_TYPES.find((b) => b.value === t)?.label ??
  LEGACY_TYPES.find((b) => b.value === t)?.label ??
  "";

export const businessCategoryOf = (t?: string | null): BusinessCategory => {
  if (!t) return "events";
  const found = BUSINESS_CATEGORIES.find((c) => c.types.some((x) => x.value === t));
  if (found) return found.id;
  return LEGACY_TYPES.find((x) => x.value === t)?.category ?? "events";
};

export interface BusinessModules {
  category: BusinessCategory;
  events: boolean;
  experiences: boolean;
  reservations: boolean;
  menu: boolean;
}

/**
 * Which tools a business sees. The category decides the defaults;
 * extra modules are opt-in from Business settings.
 */
export const resolveBusinessModules = (profile: any): BusinessModules => {
  const category = businessCategoryOf(profile?.business_type);
  return {
    category,
    events: profile?.events_enabled === true || (category === "events" && profile?.events_enabled !== false),
    experiences: category === "experiences" || profile?.experiences_enabled === true,
    reservations: category === "gastronomy" || profile?.reservations_enabled === true,
    menu: category === "gastronomy" || profile?.menu_enabled === true,
  };
};
