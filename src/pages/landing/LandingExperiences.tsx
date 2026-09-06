import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import {
  ClosingBlock,
  CommissionBlock,
  LandingHero,
} from "@/components/landing/LandingBlocks";
import { LabelStrip, MediaSplit, PhoneFrame } from "@/components/landing/PhoneFrame";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";
import { SHOTS } from "@/lib/landingShots";

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
          aside={<PhoneFrame src={SHOTS.feed} alt={t.shots.feed.title} />}
        />
      ),
    },
    {
      id: "compra",
      tone: "light",
      content: (
        <MediaSplit
          title={t.shots.detail.title}
          line={t.shots.detail.line}
          src={SHOTS.detail}
          alt={t.shots.detail.title}
        >
          <LabelStrip items={x.features.map((f) => f.title)} />
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
    {
      id: "precio",
      tone: "light",
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
