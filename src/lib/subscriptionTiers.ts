/**
 * Subscription tiers for food businesses (restaurant / coffee / bar).
 * This is intentionally hardcoded config — not a database table — so pricing and
 * feature packaging change via code, not a CMS.
 *
 * TODO: replace the placeholder prices below with the real monthly prices in Bs.
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
  /** Monthly price in Bolivianos. TODO: pricing pending. */
  price_bob: number;
  tagline: string;
  features: readonly FeatureKey[];
  /** Marketing bullets shown on the Planes screen. */
  bullets: readonly string[];
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
    price_bob: 0, // TODO: precio real
    tagline: "Lo esencial para empezar a recibir reservas",
    features: BASICO_FEATURES,
    bullets: [
      "Un turno por día",
      "Menú básico",
      "Reservas con conteo total de reservas e invitados",
    ],
  },
  profesional: {
    key: "profesional",
    name: "Profesional",
    price_bob: 0, // TODO: precio real
    tagline: "Control total de tu operación de reservas",
    features: PROFESIONAL_FEATURES,
    bullets: [
      "Todo lo del plan Básico",
      "Múltiples turnos por día",
      "Fechas bloqueadas",
      "Control de ritmo de llegadas (máx. personas por franja)",
      "Unir mesas para grupos grandes",
      "Políticas completas: cancelación y tolerancia de llegada",
      "Analíticas completas de reservas (cancelación, no-show, franjas)",
      "Prioridad en resultados de Discover y mapa de tu categoría",
    ],
  },
  elite: {
    key: "elite",
    name: "Elite",
    price_bob: 0, // TODO: precio real
    tagline: "Para grupos y locales que quieren ir un paso adelante",
    features: ELITE_FEATURES,
    bullets: [
      "Todo lo del plan Profesional",
      "Plano visual del local y mapa de mesas (próximamente)",
      "Insights de ciudad entre locales (próximamente)",
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
  return price > 0 ? `Bs. ${price}/mes` : "Precio por definir";
};
