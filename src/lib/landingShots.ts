/** Real app screenshots used across the commercial landing. */
import feedShot from "@/assets/landing/feed.webp";
import detailShot from "@/assets/landing/event_detail.webp";
import dashboardShot from "@/assets/landing/dashboard.webp";
import gestionShot from "@/assets/landing/gestion_eventos.webp";
import restaurantReservationVideo from "@/assets/landing/restaurant-reservation-recording";

export const SHOTS = {
  feed: feedShot,
  detail: detailShot,
  dashboard: dashboardShot,
  gestion: gestionShot,
} as const;

export const VIDEOS = {
  restaurantReservation: restaurantReservationVideo,
} as const;
