import { LandingShell, Reveal, type LandingSection } from "@/components/landing/LandingShell";
import {
  ClosingBlock,
  FeatureGrid,
  Kicker,
  LandingHero,
  PathCards,
  SectionHead,
} from "@/components/landing/LandingBlocks";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";

const LandingHome = () => {
  const { t } = useLanding();
  useLandingSeo(t.seo.title, t.seo.description);

  const sections: LandingSection[] = [
    {
      id: "hero",
      content: (
        <LandingHero
          kicker={t.hero.kicker}
          title={t.hero.title}
          subtitle={t.hero.subtitle}
          primary={t.hero.primary}
          secondary={t.hero.secondary}
          aside={
            <div className="rounded-[32px] border border-border bg-card p-8">
              <p className="font-brand text-[72px] font-semibold leading-none tracking-tight">
                {t.hero.stat}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t.hero.statDesc}
              </p>
            </div>
          }
        />
      ),
    },
    {
      id: "problema",
      content: (
        <div>
          <SectionHead
            kicker={t.problem.kicker}
            title={t.problem.title}
            subtitle={t.problem.subtitle}
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              {t.problem.items.map((item, i) => (
                <Reveal key={item} delay={i * 40}>
                  <div className="h-full rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed">
                    {item}
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120}>
              <div className="h-full rounded-3xl border border-border bg-card p-6">
                <Kicker>{t.problem.lossTitle}</Kicker>
                <ul className="mt-4 space-y-2">
                  {t.problem.loss.map((l) => (
                    <li key={l} className="font-brand text-2xl font-semibold">
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      ),
    },
    {
      id: "que-es",
      tone: "light",
      content: (
        <div>
          <SectionHead kicker={t.what.kicker} title={t.what.title} subtitle={t.what.subtitle} />
          <div className="mt-10 flex flex-wrap gap-2.5">
            {t.what.items.map((item, i) => (
              <Reveal key={item} delay={i * 30}>
                <span className="inline-flex rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium">
                  {item}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "unico",
      content: (
        <div>
          <SectionHead kicker={t.unique.kicker} title={t.unique.title} />
          <Reveal className="mt-8 flex flex-wrap items-center gap-3">
            {t.unique.equation.map((part, i) => (
              <span key={part} className="flex items-center gap-3">
                {i > 0 && <span className="font-brand text-2xl text-muted-foreground">+</span>}
                <span className="rounded-2xl border border-border bg-card px-5 py-3 font-brand text-lg font-semibold">
                  {part}
                </span>
              </span>
            ))}
            <span className="font-brand text-2xl text-muted-foreground">=</span>
            <span className="rounded-2xl bg-foreground px-5 py-3 font-brand text-lg font-semibold text-background">
              {t.unique.result}
            </span>
          </Reveal>
          <Reveal className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {t.unique.body}
          </Reveal>
          <FeatureGrid items={[...t.unique.bullets]} columns={2} />
        </div>
      ),
    },
    {
      id: "canales",
      tone: "light",
      content: (
        <div>
          <SectionHead
            kicker={t.channels.kicker}
            title={t.channels.title}
            subtitle={t.channels.subtitle}
          />
          <FeatureGrid items={[...t.channels.items]} />
        </div>
      ),
    },
    {
      id: "flujo",
      content: (
        <div>
          <SectionHead kicker={t.flow.kicker} title={t.flow.title} subtitle={t.flow.subtitle} />
          <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {t.flow.steps.map((step, i) => (
              <Reveal key={step} delay={i * 50}>
                <div className="h-full rounded-2xl border border-border bg-card p-5">
                  <p className="font-brand text-2xl font-semibold text-muted-foreground">
                    {i + 1}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-snug">{step}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      ),
    },
    { id: "casos", tone: "light", content: <PathCards /> },
    { id: "demo", content: <LeadForm /> },
    { id: "cierre", content: <ClosingBlock /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingHome;
