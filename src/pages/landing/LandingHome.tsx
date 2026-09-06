import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import {
  ClosingBlock,
  LandingHero,
  PathCards,
} from "@/components/landing/LandingBlocks";
import { MediaSplit, PhoneFrame } from "@/components/landing/PhoneFrame";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";
import { SHOTS } from "@/lib/landingShots";

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
          aside={<PhoneFrame src={SHOTS.feed} alt={t.shots.feed.title} />}
        />
      ),
    },
    {
      id: "descubrimiento",
      tone: "light",
      content: (
        <MediaSplit
          title={t.shots.detail.title}
          line={t.shots.detail.line}
          src={SHOTS.detail}
          alt={t.shots.detail.title}
        />
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
      id: "gestion",
      tone: "light",
      content: (
        <MediaSplit
          title={t.shots.gestion.title}
          line={t.shots.gestion.line}
          src={SHOTS.gestion}
          alt={t.shots.gestion.title}
        />
      ),
    },
    { id: "casos", content: <PathCards /> },
    { id: "demo", tone: "light", content: <LeadForm /> },
    { id: "cierre", content: <ClosingBlock /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingHome;
