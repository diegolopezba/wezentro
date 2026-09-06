import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import {
  ClosingBlock,
  CommissionBlock,
  FeatureGrid,
  LandingHero,
  SectionHead,
} from "@/components/landing/LandingBlocks";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";

const LandingEvents = () => {
  const { t } = useLanding();
  const e = t.events;
  useLandingSeo(`${e.hero.title} · Zentro`, e.hero.subtitle);

  const sections: LandingSection[] = [
    {
      id: "hero",
      content: (
        <LandingHero
          kicker={e.hero.kicker}
          title={e.hero.title}
          subtitle={e.hero.subtitle}
          primary={t.nav.cta}
          secondary={t.nav.demo}
        />
      ),
    },
    {
      id: "funciones",
      tone: "light",
      content: (
        <div>
          <SectionHead title={t.what.title} subtitle={t.what.subtitle} />
          <FeatureGrid items={[...e.features]} />
        </div>
      ),
    },
    {
      id: "precio",
      content: (
        <CommissionBlock
          kicker={e.pricing.kicker}
          title={e.pricing.title}
          big={e.pricing.big}
          body={e.pricing.body}
          bullets={[...e.pricing.bullets]}
        />
      ),
    },
    {
      id: "resultados",
      tone: "light",
      content: (
        <div>
          <SectionHead title={e.proof.title} />
          <FeatureGrid items={[...e.proof.items]} />
        </div>
      ),
    },
    { id: "demo", content: <LeadForm defaultKind="events" /> },
    { id: "cierre", content: <ClosingBlock /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingEvents;
