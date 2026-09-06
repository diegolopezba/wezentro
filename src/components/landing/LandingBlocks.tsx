import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { LandingCTAs, Reveal } from "@/components/landing/LandingShell";
import { useLanding } from "@/components/landing/LandingContext";
import {
  INSTAGRAM_URL,
  SOCIAL_HANDLE,
  TIKTOK_URL,
  WHATSAPP_DISPLAY,
  whatsappLink,
} from "@/lib/landingContent";
import {
  SUBSCRIPTION_TIERS,
  TIER_COMPARISON,
  TIER_ORDER,
  formatBs,
} from "@/lib/subscriptionTiers";

export const Kicker = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
    {children}
  </p>
);

export const SectionHead = ({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) => (
  <Reveal className="max-w-3xl">
    {kicker ? <Kicker>{kicker}</Kicker> : null}
    <h2 className="mt-3 font-brand text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{subtitle}</p>
    ) : null}
  </Reveal>
);

export const FeatureGrid = ({
  items,
  columns = 3,
}: {
  items: { title: string; desc: string }[];
  columns?: 2 | 3;
}) => (
  <div
    className={cn(
      "mt-10 grid gap-3 sm:grid-cols-2",
      columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
    )}
  >
    {items.map((item, i) => (
      <Reveal key={item.title} delay={i * 40}>
        <div className="h-full rounded-3xl border border-border bg-card p-6">
          <p className="text-base font-semibold">{item.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
        </div>
      </Reveal>
    ))}
  </div>
);

/** The three restaurant plans, straight from the subscription config. */
export const PlansBlock = () => {
  const { t } = useLanding();
  const r = t.restaurants;

  return (
    <div>
      <SectionHead title={r.plansTitle} subtitle={r.plansSubtitle} />

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {TIER_ORDER.map((key, i) => {
          const tier = SUBSCRIPTION_TIERS[key];
          const featured = key === "profesional";
          return (
            <Reveal key={key} delay={i * 60}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-3xl border p-6",
                  featured ? "dark-island border-transparent" : "border-border bg-card",
                )}
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {tier.name}
                </p>
                <p className="mt-3 font-brand text-4xl font-semibold">
                  {formatBs(tier.price_bob)}
                  <span className="text-base font-normal text-muted-foreground">/mes</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{r.perDay(tier.price_bob)}</p>
                <p className="mt-4 text-sm font-medium">{tier.sizeLabel}</p>
                <p className="text-sm text-muted-foreground">{tier.tagline}</p>

                <ul className="mt-5 space-y-2.5">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm leading-snug">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-8 overflow-hidden rounded-3xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="p-3 font-semibold"> </th>
              {TIER_ORDER.map((k) => (
                <th key={k} className="p-3 font-semibold">
                  {SUBSCRIPTION_TIERS[k].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIER_COMPARISON.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="p-3 text-muted-foreground">{row.label}</td>
                {TIER_ORDER.map((k) => (
                  <td key={k} className="p-3">
                    {row.values[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <p className="mt-4 text-xs text-muted-foreground">{r.plansNote}</p>
    </div>
  );
};

export const FAQBlock = () => {
  const { t } = useLanding();
  return (
    <div>
      <SectionHead title={t.restaurants.faqTitle} />
      <Accordion type="single" collapsible className="mt-8 max-w-3xl">
        {t.restaurants.faq.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="text-left text-base font-semibold">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export const PathCards = () => {
  const { t } = useLanding();
  const p = t.paths;
  const cards = [
    { ...p.events, to: "/landing/eventos" },
    { ...p.restaurants, to: "/landing/restaurantes" },
    { ...p.experiences, to: "/landing/experiencias" },
  ];

  return (
    <div>
      <SectionHead kicker={p.kicker} title={p.title} subtitle={p.subtitle} />
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.to} delay={i * 60}>
            <Link
              to={c.to}
              className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-transform active:scale-[0.99]"
            >
              <p className="font-brand text-2xl font-semibold">{c.title}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <p className="mt-5 text-sm font-semibold">{c.price}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                {p.open}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export const ClosingBlock = () => {
  const { t } = useLanding();
  return (
    <div className="rounded-[32px] border border-border bg-card p-8 sm:p-12">
      <Reveal>
        <h2 className="max-w-3xl font-brand text-3xl font-semibold leading-tight sm:text-4xl">
          {t.closing.title}
        </h2>
        <p className="mt-3 text-muted-foreground">{t.closing.subtitle}</p>
        <LandingCTAs
          className="mt-7"
          primaryLabel={t.closing.cta}
          secondaryLabel={t.closing.demo}
        />

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a
            className="inline-flex items-center gap-1.5 font-medium text-foreground"
            href={whatsappLink("Hola Zentro, quiero información para mi negocio.")}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-4 w-4" />
            {WHATSAPP_DISPLAY}
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            Instagram {SOCIAL_HANDLE}
          </a>
          <a href={TIKTOK_URL} target="_blank" rel="noreferrer">
            TikTok {SOCIAL_HANDLE}
          </a>
          <span>www.zentro.today</span>
        </div>
      </Reveal>
    </div>
  );
};

export const CommissionBlock = ({
  kicker,
  title,
  big,
  body,
  bullets,
}: {
  kicker: string;
  title: string;
  big: string;
  body: string;
  bullets: string[];
}) => (
  <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
    <Reveal>
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-3 font-brand text-3xl font-semibold leading-tight sm:text-5xl">{title}</h2>
      <p className="mt-8 font-brand text-[88px] font-semibold leading-none tracking-tight">{big}</p>
      <p className="mt-2 max-w-sm text-muted-foreground">{body}</p>
    </Reveal>
    <Reveal delay={80}>
      <ul className="space-y-3">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  </div>
);

export const LandingHero = ({
  kicker,
  title,
  subtitle,
  primary,
  secondary,
  aside,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
  aside?: ReactNode;
}) => (
  <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
    <Reveal>
      <Kicker>{kicker}</Kicker>
      <h1 className="mt-4 font-brand text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        {title}
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {subtitle}
      </p>
      <LandingCTAs className="mt-8" primaryLabel={primary} secondaryLabel={secondary} />
    </Reveal>
    {aside ? <Reveal delay={120}>{aside}</Reveal> : null}
  </div>
);

export const SecondaryCTA = ({ label }: { label: string }) => (
  <Button asChild variant="outline" className="h-11 rounded-full px-6">
    <a
      href={whatsappLink("Hola Zentro, quiero una demo para mi negocio.")}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  </Button>
);
