import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import { ClosingBlock, CommissionBlock, LandingHero } from "@/components/landing/LandingBlocks";
import { LabelStrip, MediaSplit } from "@/components/landing/PhoneFrame";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";
import { SHOTS, VIDEOS } from "@/lib/landingShots";

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
          primary={t.nav.ctaExperiences}
          secondary={t.nav.demo}
          aside={
            <video
              src={VIDEOS.experiencesHero}
              poster={POSTERS.experiencesHero}
              preload="metadata"
              autoPlay
              muted
              loop
              playsInline
              className="mx-auto block w-[70%] max-h-[600px] object-contain"
            />
          }
        />
      ),
    },
    {
      id: "compra",
      tone: "light",
      content: (
        <MediaSplit
          title={x.shots.detail.title}
          line={x.shots.detail.line}
          src={VIDEOS.purchaseExperience}
          alt={x.shots.detail.title}
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
          title={x.shots.dashboard.title}
          line={x.shots.dashboard.line}
          src={SHOTS.dashboard}
          alt={x.shots.dashboard.title}
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
    { id: "cierre", content: <ClosingBlock cta={t.nav.ctaExperiences} /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingExperiences;
