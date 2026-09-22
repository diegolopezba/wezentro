/** Real app screenshots used across the commercial landing. */
import feedShot from "@/assets/landing/feed.webp";
import detailShot from "@/assets/landing/event_detail.webp";
import dashboardShot from "@/assets/landing/dashboard-mobile.jpeg";
import gestionShot from "@/assets/landing/gestion_evento.jpeg";
import restaurantReservationVideo from "@/assets/landing/restaurant-reservation.mp4";
import restaurantHeroVideo from "@/assets/landing/restaurant-video-hero.mp4";
import eventsHeroAsset from "@/assets/events-hero.mp4.asset.json";
import experiencesHeroVideo from "@/assets/landing/experiencias-hero.mp4";
import experiencesHeroPoster from "@/assets/landing/experiencias-hero-poster.jpg";
import purchaseExperienceVideo from "@/assets/landing/purchase-experience.mp4";
import purchaseExperiencePoster from "@/assets/landing/purchase-experience-poster.jpg";

export const SHOTS = {
  feed: feedShot,
  detail: detailShot,
  dashboard: dashboardShot,
  gestion: gestionShot,
} as const;

export const VIDEOS = {
  restaurantReservation: restaurantReservationVideo,
  restaurantHero: restaurantHeroVideo,
  eventsHero: eventsHeroAsset.url,
  experiencesHero: experiencesHeroVideo,
  purchaseExperience: purchaseExperienceVideo,
} as const;

/** First-frame stills shown while the videos buffer. */
export const POSTERS = {
  experiencesHero: experiencesHeroPoster,
  purchaseExperience: purchaseExperiencePoster,
} as const;
