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
  | "reservation_waitlist"
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
];

const PREMIUM_FEATURES: readonly FeatureKey[] = [
  ...PROFESIONAL_FEATURES,
  "reservation_waitlist",
  "priority_placement",
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
      "Hasta 9 mesas",
      "Reservas online básicas con confirmación automática",
      "Menú básico",
      "Conteos del día: total de reservas e invitados",
    ],
    badge: "Locales pequeños",
    highlights: [
      {
        icon: "calendar",
        title: "Reservas online básicas",
        description: "Recibí reservas con confirmación automática, sin llamadas ni WhatsApp.",
      },
      {
        icon: "menu",
        title: "Menú básico",
        description: "Publicá tu menú con cada publicación que hagas.",
      },
      {
        icon: "chart",
        title: "Conteos del día",
        description: "Total de reservas e invitados.",
      },
    ],
  },
  profesional: {
    key: "profesional",
    name: "Profesional",
    price_bob: 300,
    maxTables: 20,
    sizeLabel: "Hasta 20 mesas",
    tagline: "Control total de tu operación de reservas",
    features: PROFESIONAL_FEATURES,
    bullets: [
      "Hasta 20 mesas",
      "Todo lo de Básico: reservas y menús completos",
      "Múltiples turnos: desayuno, almuerzo y cena por separado",
      "Analíticas completas: no-shows, cancelaciones, horarios que más se llenan y demografía",
    ],
    badge: "Recomendado",
    highlights: [
      {
        icon: "sparkles",
        title: "Todo lo de Básico",
        description: "Reservas y menús completos.",
      },
      {
        icon: "clock",
        title: "Múltiples turnos",
        description: "Desayuno, almuerzo y cena por separado.",
      },
      {
        icon: "chart",
        title: "Analíticas completas",
        description:
          "No-shows, cancelaciones, los horarios que más se llenan, demografía de tu público y mucho más.",
      },
    ],
  },
  elite: {
    key: "elite",
    name: "Premium",
    price_bob: 500,
    maxTables: null,
    sizeLabel: "Más de 20 mesas",
    tagline: "Para lugares que quieren ir un paso adelante",
    features: PREMIUM_FEATURES,
    bullets: [
      "Más de 20 mesas",
      "Todo lo de Profesional: reservas, menús, analíticas y turnos",
      "Waiting List para aprovechar cancelaciones",
      "Prioridad en discovery",
      "Insights de la ciudad",
    ],
    highlights: [
      {
        icon: "sparkles",
        title: "Todo lo de Profesional",
        description: "Reservas, menús, analíticas, turnos, todo completo.",
      },
      {
        icon: "clock",
        title: "Waiting List",
        description: "Aprovechá la cancelación de un cliente para notificar a otro.",
      },
      {
        icon: "trending",
        title: "Prioridad en discovery",
        description: "Preferencia de posicionamiento en el feed de descubrimiento.",
      },
      {
        icon: "map",
        title: "Insights de la ciudad",
        description:
          "Información y comparaciones con otras empresas de la industria, para tomar mejores decisiones.",
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

export type BillingInterval = "month" | "year";

/** Paying 12 months up front saves 5%. Mirrored in the edge functions. */
export const YEARLY_DISCOUNT = 0.05;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Total charged for one billing cycle. */
export const cyclePrice = (tier: TierKey, interval: BillingInterval): number => {
  const monthly = SUBSCRIPTION_TIERS[tier].price_bob;
  return interval === "year" ? round2(monthly * 12 * (1 - YEARLY_DISCOUNT)) : round2(monthly);
};

/** How much a business saves per year by paying annually. */
export const yearlySavings = (tier: TierKey): number =>
  round2(SUBSCRIPTION_TIERS[tier].price_bob * 12 - cyclePrice(tier, "year"));

export const formatBs = (amount: number): string =>
  `Bs. ${Number(amount).toFixed(2).replace(/\.00$/, "")}`;

export const formatTierPrice = (tier: TierKey, interval: BillingInterval = "month"): string => {
  const price = SUBSCRIPTION_TIERS[tier].price_bob;
  if (price <= 0) return "Gratis";
  return interval === "year"
    ? `${formatBs(cyclePrice(tier, "year"))}/año`
    : `${formatBs(price)}/mes`;
};

/** "Bs. 25/mes equivalente" for the annual option. */
export const yearlyEquivalentLabel = (tier: TierKey): string =>
  `${formatBs(round2(cyclePrice(tier, "year") / 12))}/mes equivalente`;

/** Max tables a plan allows (null = unlimited). */
export const maxTablesForTier = (tier: TierKey): number | null =>
  SUBSCRIPTION_TIERS[tier].maxTables;

/** Message shown when a business hits its table limit. */
export const tableLimitLabel = (tier: TierKey): string => {
  const max = maxTablesForTier(tier);
  if (max == null) return "";
  const next = tier === "basico" ? "Profesional" : "Premium";
  return `Tu plan ${SUBSCRIPTION_TIERS[tier].name} permite hasta ${max} mesas. Pasá a ${next} para agregar más.`;
};

/** Price anchoring: "Bs. 250/mes · unos Bs. 8 por día". */
export const dailyPriceLabel = (tier: TierKey): string => {
  const price = SUBSCRIPTION_TIERS[tier].price_bob;
  if (price <= 0) return "";
  return `unos Bs. ${Math.round(price / 30)} por día`;
};

/** Rows of the collapsible comparison table on the Planes screen. */
export const TIER_COMPARISON: readonly {
  label: string;
  values: Record<TierKey, string>;
}[] = [
  {
    label: "Mesas configurables",
    values: { basico: "Hasta 9", profesional: "Hasta 20", elite: "Ilimitadas" },
  },
  {
    label: "Turnos por día",
    values: { basico: "1", profesional: "Varios", elite: "Varios" },
  },
  {
    label: "Fechas bloqueadas",
    values: { basico: "—", profesional: "Sí", elite: "Sí" },
  },
  {
    label: "Ritmo de llegadas",
    values: { basico: "—", profesional: "Sí", elite: "Sí" },
  },
  {
    label: "Unir mesas",
    values: { basico: "—", profesional: "Sí", elite: "Sí" },
  },
  {
    label: "Analíticas de reservas",
    values: { basico: "Conteos", profesional: "Completas", elite: "Completas" },
  },
  {
    label: "Waiting List de reservas",
    values: { basico: "—", profesional: "—", elite: "Sí" },
  },
  {
    label: "Prioridad en discovery",
    values: { basico: "—", profesional: "—", elite: "Sí" },
  },
  {
    label: "Insights de la ciudad",
    values: { basico: "—", profesional: "—", elite: "Sí" },
  },
];

export const PLAN_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "¿Cómo pago el plan?",
    a: "Con QR desde la app. Elegís el plan, escaneás el QR con tu banco y se activa al instante. Podés pagar mes a mes o 12 meses por adelantado con 5% de descuento.",
  },
  {
    q: "¿Se renueva solo?",
    a: "No hacemos débito automático: te avisamos 3 días antes del vencimiento y pagás con QR de nuevo. Si se vence, tenés 5 días de gracia antes de que se desactiven las funciones.",
  },
  {
    q: "¿Me cobran comisión por reserva?",
    a: "No. La mensualidad es lo único que pagás por las reservas; no cobramos por reserva recibida.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí, subís o bajás de plan cuando quieras. No hay permanencia ni penalidad.",
  },
  {
    q: "¿Qué pasa con mis reservas si cancelo?",
    a: "Tus reservas ya confirmadas siguen visibles. Se pausa la posibilidad de recibir nuevas reservas hasta que reactives el plan.",
  },
];
