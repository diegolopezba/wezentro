import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import {
  ClosingBlock,
  FAQBlock,
  LandingHero,
  PlansBlock,
} from "@/components/landing/LandingBlocks";
import { LabelStrip, MediaSplit, PhoneFrame } from "@/components/landing/PhoneFrame";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";
import { SHOTS } from "@/lib/landingShots";

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
          aside={<PhoneFrame src={SHOTS.feed} alt={t.shots.feed.title} />}
        />
      ),
    },
    {
      id: "reservas",
      tone: "light",
      content: (
        <MediaSplit
          title={t.shots.detail.title}
          line={t.shots.detail.line}
          src={SHOTS.detail}
          alt={t.shots.detail.title}
        >
          <LabelStrip items={r.features.map((f) => f.title)} />
        </MediaSplit>
      ),
    },
    {
      id: "datos",
      content: (
        <MediaSplit
          reverse
          title={t.shots.dashboard.title}
          line={t.shots.dashboard.line}
          src={SHOTS.dashboard}
          alt={t.shots.dashboard.title}
        />
      ),
    },
    { id: "planes", tone: "light", content: <PlansBlock /> },
    { id: "faq", content: <FAQBlock /> },
    { id: "demo", tone: "light", content: <LeadForm defaultKind="restaurant" /> },
    { id: "cierre", content: <ClosingBlock /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingRestaurants;
