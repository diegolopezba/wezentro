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

const LandingExperiences = () => {
  const { t } = useLanding();
  const x = t.experiences;
  useLandingSeo(`${x.hero.title} · Zentro`, x.hero.subtitle);

  const sections: LandingSection[] = [
    {
      id: "hero",
      content: (
        <LandingHero
          kicker={x.hero.kicker}
          title={x.hero.title}
          subtitle={x.hero.subtitle}
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
          <SectionHead title={t.flow.title} subtitle={t.flow.subtitle} />
          <FeatureGrid items={[...x.features]} />
        </div>
      ),
    },
    {
      id: "precio",
      content: (
        <CommissionBlock
          kicker={x.pricing.kicker}
          title={x.pricing.title}
          big={x.pricing.big}
          body={x.pricing.body}
          bullets={[...x.pricing.bullets]}
        />
      ),
    },
    { id: "demo", content: <LeadForm defaultKind="experiences" /> },
    { id: "cierre", content: <ClosingBlock /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingExperiences;
