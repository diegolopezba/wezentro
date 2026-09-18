import { LandingShell, type LandingSection } from "@/components/landing/LandingShell";
import { ClosingBlock, FAQBlock, LandingHero, PlansBlock } from "@/components/landing/LandingBlocks";
import { LabelStrip, MediaSplit } from "@/components/landing/PhoneFrame";
import { LeadForm } from "@/components/landing/LeadForm";
import { useLanding } from "@/components/landing/LandingContext";
import { useLandingSeo } from "@/pages/landing/useLandingSeo";
import { SHOTS, VIDEOS } from "@/lib/landingShots";

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
          primary={t.nav.ctaRestaurants}
          secondary={t.nav.demo}
          aside={
            <video
              src={VIDEOS.restaurantHero}
              autoPlay
              muted
              loop
              playsInline
              className="mx-auto block w-[80%] h-full object-cover"
            />
          }
        />
      ),
    },
    {
      id: "reservas",
      tone: "light",
      content: (
        <MediaSplit
          title={r.shots.detail.title}
          line={r.shots.detail.line}
          src={VIDEOS.restaurantReservation}
          alt={r.shots.detail.title}
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
          title={r.shots.dashboard.title}
          line={r.shots.dashboard.line}
          src={SHOTS.dashboard}
          alt={r.shots.dashboard.title}
        />
      ),
    },
    { id: "planes", tone: "light", content: <PlansBlock /> },
    { id: "faq", content: <FAQBlock /> },
    { id: "demo", tone: "light", content: <LeadForm defaultKind="restaurant" /> },
    { id: "cierre", content: <ClosingBlock cta={t.nav.ctaRestaurants} /> },
  ];

  return <LandingShell sections={sections} />;
};

export default LandingRestaurants;
