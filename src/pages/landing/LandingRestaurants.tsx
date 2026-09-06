import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import {
  ClosingBlock,
  FAQBlock,
  FeatureGrid,
  LandingHero,
  PlansBlock,
  SectionHead,
} from "@/components/landing/LandingBlocks";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";

const LandingRestaurants = () => {
  const { t } = useLanding();
  const r = t.restaurants;
  useLandingSeo(`${r.hero.title} · Zentro`, r.hero.subtitle);

  const sections: LandingSection[] = [
    {
      id: "hero",
      content: (
        <LandingHero
          kicker={r.hero.kicker}
          title={r.hero.title}
          subtitle={r.hero.subtitle}
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
          <FeatureGrid items={[...r.features]} />
        </div>
      ),
    },
    { id: "planes", tone: "light", content: <PlansBlock /> },
    { id: "faq", content: <FAQBlock /> },
    { id: "demo", content: <LeadForm defaultKind="restaurant" /> },
    { id: "cierre", content: <ClosingBlock /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingRestaurants;
