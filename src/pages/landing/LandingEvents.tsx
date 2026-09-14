import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import { ClosingBlock, CommissionBlock, LandingHero } from "@/components/landing/LandingBlocks";
import { LabelStrip, MediaSplit, PhoneFrame } from "@/components/landing/PhoneFrame";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";
import { SHOTS } from "@/lib/landingShots";

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
          primary={t.nav.ctaEvents}
          secondary={t.nav.demo}
          aside={<PhoneFrame src={SHOTS.detail} alt={t.shots.detail.title} />}
        />
      ),
    },
    {
      id: "gestion",
      tone: "light",
      content: (
        <MediaSplit
          title={e.shots.gestion.title}
          line={e.shots.gestion.line}
          src={SHOTS.gestion}
          alt={e.shots.gestion.title}
        >
          <LabelStrip items={e.features.map((f) => f.title)} />
        </MediaSplit>
      ),
    },
    {
      id: "datos",
      content: (
        <MediaSplit
          reverse
          title={e.shots.dashboard.title}
          line={e.shots.dashboard.line}
          src={SHOTS.dashboard}
          alt={e.shots.dashboard.title}
        />
      ),
    },
    {
      id: "precio",
      tone: "light",
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
    { id: "demo", content: <LeadForm defaultKind="events" /> },
    { id: "cierre", content: <ClosingBlock cta={t.nav.ctaEvents} /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingEvents;
