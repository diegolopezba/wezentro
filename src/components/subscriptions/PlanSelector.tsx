import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Clock,
  Gauge,
  Map as MapIcon,
  Rows3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SUBSCRIPTION_TIERS,
  TIER_ORDER,
  TierHighlightIcon,
  TierKey,
  BillingInterval,
  formatTierPrice,
  formatBs,
  yearlySavings,
  yearlyEquivalentLabel,
  dailyPriceLabel,
  TIER_COMPARISON,
  PLAN_FAQ,
} from "@/lib/subscriptionTiers";
import { PlanConfirmSheet } from "@/components/subscriptions/PlanConfirmSheet";
import { PlanRecommendationStep } from "@/components/subscriptions/PlanRecommendationStep";

const ICONS: Record<TierHighlightIcon, typeof Check> = {
  calendar: CalendarDays,
  clock: Clock,
  gauge: Gauge,
  table: Rows3,
  shield: ShieldCheck,
  chart: BarChart3,
  sparkles: Sparkles,
  map: MapIcon,
  trending: TrendingUp,
  menu: UtensilsCrossed,
};

interface PlanSelectorProps {
  currentTier: TierKey;
  /** Tier pre-selected when the selector mounts. */
  initialTier?: TierKey;
  /** "page" renders on the dark app background; "sheet" inside a light sheet. */
  variant?: "page" | "sheet";
  /** Rendered on the right of the title (close / skip). */
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Small line under the title (e.g. current plan status). */
  subtitle?: string;
  /** Secondary link under the CTA (e.g. "Ver todos los detalles"). */
  footerSlot?: React.ReactNode;
  /** Ask "how many tables do you have?" first and pre-select the matching plan. */
  askRecommendation?: boolean;
  /** No paid plan yet: CTA always reads as an activation. */
  needsActivation?: boolean;
}

/**
 * Shared plan picker used by both the Planes page and the plans bottom sheet:
 * tier pills on top, one hero card at a time, highlighted features below and a
 * sticky call to action that clears the home indicator.
 */
export const PlanSelector = ({
  currentTier,
  initialTier,
  variant = "page",
  onDismiss,
  dismissLabel = "Omitir",
  subtitle,
  footerSlot,
  askRecommendation = false,
  needsActivation = false,
}: PlanSelectorProps) => {
  const [selected, setSelected] = useState<TierKey>(initialTier ?? currentTier);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [showRecommendation, setShowRecommendation] = useState(askRecommendation);
  const [recommended, setRecommended] = useState<TierKey | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const pillRefs = useRef<Partial<Record<TierKey, HTMLButtonElement | null>>>({});

  useEffect(() => {
    pillRefs.current[selected]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selected]);

  const tier = SUBSCRIPTION_TIERS[selected];
  const isCurrent = selected === currentTier;
  const isSheet = variant === "sheet";

  const goTo = (dir: 1 | -1) => {
    const idx = TIER_ORDER.indexOf(selected);
    const next = TIER_ORDER[idx + dir];
    if (next) setSelected(next);
  };

  if (showRecommendation) {
    return (
      <PlanRecommendationStep
        onPick={(t) => {
          setRecommended(t);
          setSelected(t);
          setShowRecommendation(false);
        }}
        onSkip={() => setShowRecommendation(false)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Title row */}
      <div className="flex items-baseline justify-between px-1 pt-1">
        <h2 className="font-brand text-[28px] font-medium leading-tight text-foreground">
          Elegí tu plan
        </h2>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm font-medium text-muted-foreground active:opacity-60"
          >
            {dismissLabel}
          </button>
        )}
      </div>

      {subtitle && (
        <p className="px-1 pt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}

      {/* Tier pills */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-2">
          {TIER_ORDER.map((key) => {
            const active = key === selected;
            return (
              <button
                key={key}
                type="button"
                ref={(el) => {
                  pillRefs.current[key] = el;
                }}
                onClick={() => setSelected(key)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground active:bg-muted/60",
                )}
              >
                {SUBSCRIPTION_TIERS[key].name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="-mx-4 mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={selected}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) goTo(1);
              else if (info.offset.x > 60) goTo(-1);
            }}
          >
            {/* Hero card */}
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl p-5",
                isSheet ? "bg-foreground text-background" : "bg-card border border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3
                  className={cn(
                    "font-brand text-[30px] font-medium leading-none",
                    isSheet ? "text-background" : "text-foreground",
                  )}
                >
                  {tier.name}
                </h3>
                {(isCurrent || tier.badge || recommended === selected) && (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                      isSheet
                        ? "bg-background/15 text-background"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCurrent && <Check className="h-3 w-3" />}
                    {isCurrent
                      ? "Activo"
                      : recommended === selected
                        ? "Recomendado para vos"
                        : tier.badge}
                  </span>
                )}
              </div>

              <p
                className={cn(
                  "mt-4 text-lg font-semibold",
                  isSheet ? "text-background" : "text-foreground",
                )}
              >
                {formatTierPrice(selected, interval)}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[13px]",
                  isSheet ? "text-background/60" : "text-muted-foreground",
                )}
              >
                {interval === "year"
                  ? `${yearlyEquivalentLabel(selected)} · ahorrás ${formatBs(yearlySavings(selected))} al año`
                  : dailyPriceLabel(selected)}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  isSheet ? "text-background/70" : "text-muted-foreground",
                )}
              >
                {tier.sizeLabel} · {tier.tagline}
              </p>

              {/* Billing interval */}
              <div
                className={cn(
                  "mt-4 flex gap-1 rounded-full p-1",
                  isSheet ? "bg-background/15" : "bg-muted",
                )}
              >
                {(["month", "year"] as BillingInterval[]).map((opt) => {
                  const active = interval === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setInterval(opt)}
                      className={cn(
                        "flex-1 rounded-full py-2 text-[13px] font-medium transition-colors",
                        active
                          ? isSheet
                            ? "bg-background text-foreground"
                            : "bg-foreground text-background"
                          : isSheet
                            ? "text-background/70"
                            : "text-muted-foreground",
                      )}
                    >
                      {opt === "month" ? "Mensual" : "12 meses · -5%"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Highlights */}
            <h4 className="mt-6 font-brand text-base font-semibold text-foreground">
              Funciones destacadas
            </h4>
            <div className="mt-3 space-y-2">
              {tier.highlights.map((h) => {
                const Icon = ICONS[h.icon];
                return (
                  <div
                    key={h.title}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl p-4",
                      isSheet ? "bg-muted/60" : "bg-card border border-border/60",
                    )}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{h.title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                        {h.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
              <button
                type="button"
                onClick={() => setShowComparison((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              >
                <span className="text-sm font-semibold text-foreground">Comparar planes</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    showComparison && "rotate-180",
                  )}
                />
              </button>
              {showComparison && (
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-x-2 border-b border-border/60 pb-2 text-[11px] font-semibold text-muted-foreground">
                    <span />
                    {TIER_ORDER.map((k) => (
                      <span key={k} className="text-center">
                        {SUBSCRIPTION_TIERS[k].name}
                      </span>
                    ))}
                  </div>
                  {TIER_COMPARISON.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-x-2 border-b border-border/40 py-2 text-[12px] last:border-0"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      {TIER_ORDER.map((k) => (
                        <span key={k} className="text-center text-foreground">
                          {row.values[k]}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FAQ */}
            <h4 className="mt-6 font-brand text-base font-semibold text-foreground">
              Preguntas frecuentes
            </h4>
            <div className="mt-2 overflow-hidden rounded-2xl border border-border/60 divide-y divide-border/60">
              {PLAN_FAQ.map((f) => (
                <div key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq((v) => (v === f.q ? null : f.q))}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="text-[13px] font-medium text-foreground">{f.q}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        openFaq === f.q && "rotate-180",
                      )}
                    />
                  </button>
                  {openFaq === f.q && (
                    <p className="px-4 pb-3.5 text-[13px] leading-snug text-muted-foreground">
                      {f.a}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {footerSlot && <div className="pt-4">{footerSlot}</div>}
            <div className="h-4" />
          </m.div>
        </AnimatePresence>
      </div>

      {/* Sticky CTA */}
      <div
        className={cn(
          "-mx-4 shrink-0 border-t border-border/50 px-4 pt-3",
          isSheet ? "pb-[max(env(safe-area-inset-bottom),12px)]" : "safe-bottom pb-3",
        )}
      >
        {!isCurrent && (
          <p className="pb-2 text-center text-[11px] text-muted-foreground">
            Sin permanencia · Sin comisión por reserva · Cancelás cuando quieras
            <br />
            Los eventos y experiencias con ticketing tienen 6% de comisión por entrada vendida.
          </p>
        )}
        <Button
          type="button"
          variant="sheet-action"
          className="h-12 w-full rounded-full text-base"
          onClick={() => setConfirmOpen(true)}
        >
          {isCurrent && !needsActivation
            ? interval === "year"
              ? "Pasar a 12 meses"
              : "Renovar mi plan"
            : `Quiero ${tier.name}`}
        </Button>
      </div>

      <PlanConfirmSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tier={selected}
        interval={interval}
        isUpgrade={!needsActivation && !isCurrent}
      />
    </div>
  );
};
