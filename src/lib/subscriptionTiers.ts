/**
 * Subscription tiers for food businesses (restaurant / coffee / bar).
 * This is intentionally hardcoded config — not a database table — so pricing and
 * feature packaging change via code, not a CMS.
*/

export type TierKey = "basico" | "profesional" | "elite";

export type FeatureKey =
  | "multi_shift"
  | "blackout_dates"
  | "covers_pacing"
  | "table_joining"
  | "full_reservation_policy"
  | "reservas_analytics_full"
  | "priority_placement"
  | "venue_layout"
  | "city_insights";

export interface TierConfig {
  key: TierKey;
  name: string;
  /** Monthly price in Bolivianos. */
  price_bob: number;
  /** Max reservable tables the business can configure (null = unlimited). */
  maxTables: number | null;
  /** Short venue-size label shown on the plan card. */
  sizeLabel: string;
  tagline: string;
  features: readonly FeatureKey[];
  /** Marketing bullets shown on the Planes screen. */
  bullets: readonly string[];
  /** Short badge shown on the hero card (e.g. "Complementario", "Recomendado"). */
  badge?: string;
  /** Highlighted features rendered in the "Funciones destacadas" block. */
  highlights: readonly TierHighlight[];
}

/** Icon keys are mapped to lucide icons inside the Planes UI. */
export type TierHighlightIcon =
  | "calendar"
  | "clock"
  | "gauge"
  | "table"
  | "shield"
  | "chart"
  | "sparkles"
  | "map"
  | "trending"
  | "menu";

export interface TierHighlight {
  icon: TierHighlightIcon;
  title: string;
  description: string;
}

const BASICO_FEATURES: readonly FeatureKey[] = [];

const PROFESIONAL_FEATURES: readonly FeatureKey[] = [
  "multi_shift",
  "blackout_dates",
  "covers_pacing",
  "table_joining",
  "full_reservation_policy",
  "reservas_analytics_full",
  "priority_placement",
];

const ELITE_FEATURES: readonly FeatureKey[] = [
  ...PROFESIONAL_FEATURES,
  "venue_layout",
  "city_insights",
];

export const SUBSCRIPTION_TIERS: Record<TierKey, TierConfig> = {
  basico: {
    key: "basico",
    name: "Básico",
    price_bob: 250,
    maxTables: 9,
    sizeLabel: "Hasta 9 mesas",
    tagline: "Lo esencial para empezar a recibir reservas",
    features: BASICO_FEATURES,
    bullets: [
      "Para locales pequeños: hasta 9 mesas",
      "Un turno por día",
      "Menú básico",
      "Reservas con conteo total de reservas e invitados",
    ],
    badge: "Locales pequeños",
    highlights: [
      {
        icon: "calendar",
        title: "Reservas online",
        description: "Recibí reservas con confirmación automática, sin llamadas ni WhatsApp.",
      },
      {
        icon: "menu",
        title: "Menú básico",
        description: "Publicá tu carta para que la gente sepa qué vas a servir.",
      },
      {
        icon: "chart",
        title: "Conteos del día",
        description: "Total de reservas e invitados, para saber cómo viene la noche.",
      },
    ],
  },
  profesional: {
    key: "profesional",
    name: "Profesional",
    price_bob: 350,
    maxTables: 20,
    sizeLabel: "De 10 a 20 mesas",
    tagline: "Control total de tu operación de reservas",
    features: PROFESIONAL_FEATURES,
    bullets: [
      "Todo lo del plan Básico",
      "Para locales medianos: de 10 a 20 mesas",
      "Múltiples turnos por día",
      "Fechas bloqueadas",
      "Control de ritmo de llegadas (máx. personas por franja)",
      "Unir mesas para grupos grandes",
      "Políticas completas: cancelación y tolerancia de llegada",
      "Analíticas completas de reservas (cancelación, no-show, franjas)",
      "Prioridad en resultados de Discover y mapa de tu categoría",
    ],
    badge: "Recomendado",
    highlights: [
      {
        icon: "clock",
        title: "Múltiples turnos y bloqueos",
        description: "Almuerzo y cena por separado, más fechas bloqueadas cuando cerrás.",
      },
      {
        icon: "gauge",
        title: "Ritmo de llegadas",
        description: "Limitá cuántas personas entran por franja para no saturar la cocina.",
      },
      {
        icon: "table",
        title: "Unir mesas",
        description: "Aceptá grupos grandes combinando mesas disponibles automáticamente.",
      },
      {
        icon: "chart",
        title: "Analíticas completas",
        description: "No-shows, cancelaciones y las franjas que más te llenan.",
      },
      {
        icon: "trending",
        title: "Prioridad en Discover",
        description: "Tu local aparece más arriba en resultados y mapa de tu categoría.",
      },
    ],
  },
  elite: {
    key: "elite",
    name: "Elite",
    price_bob: 500,
    maxTables: null,
    sizeLabel: "Más de 20 mesas",
    tagline: "Para grupos y locales que quieren ir un paso adelante",
    features: ELITE_FEATURES,
    bullets: [
      "Todo lo del plan Profesional",
      "Para locales grandes: más de 20 mesas",
      "Plano visual del local y mapa de mesas (próximamente)",
      "Insights de ciudad entre locales (próximamente)",
    ],
    highlights: [
      {
        icon: "sparkles",
        title: "Todo lo del plan Profesional",
        description: "Turnos, ritmo, mesas unidas, políticas y analíticas completas.",
      },
      {
        icon: "map",
        title: "Plano visual del local",
        description: "Mapa de mesas y selección por área. Próximamente.",
      },
      {
        icon: "trending",
        title: "Insights de ciudad",
        description: "Comparate con locales similares de tu ciudad. Próximamente.",
      },
    ],
  },
};

export const TIER_ORDER: readonly TierKey[] = ["basico", "profesional", "elite"];

export const tierHasFeature = (tier: TierKey, feature: FeatureKey): boolean =>
  SUBSCRIPTION_TIERS[tier].features.includes(feature);

/** Lowest tier that unlocks a given feature (used for "Disponible en el plan X" labels). */
export const tierForFeature = (feature: FeatureKey): TierKey | null =>
  TIER_ORDER.find((t) => tierHasFeature(t, feature)) ?? null;

export const featureUpgradeLabel = (feature: FeatureKey): string => {
  const tier = tierForFeature(feature);
  return tier ? `Disponible en el plan ${SUBSCRIPTION_TIERS[tier].name}` : "";
};

export const formatTierPrice = (tier: TierKey): string => {
  const price = SUBSCRIPTION_TIERS[tier].price_bob;
  return price > 0 ? `Bs. ${price}/mes` : "Gratis";
};

/** Max tables a plan allows (null = unlimited). */
export const maxTablesForTier = (tier: TierKey): number | null =>
  SUBSCRIPTION_TIERS[tier].maxTables;

/** Message shown when a business hits its table limit. */
export const tableLimitLabel = (tier: TierKey): string => {
  const max = maxTablesForTier(tier);
  if (max == null) return "";
  const next = tier === "basico" ? "Profesional" : "Elite";
  return `Tu plan ${SUBSCRIPTION_TIERS[tier].name} permite hasta ${max} mesas. Pasá a ${next} para agregar más.`;
};
