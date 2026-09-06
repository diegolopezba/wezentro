/** Real app screenshots used across the commercial landing. */
import feedAsset from "@/assets/landing/feed.png.asset.json";
import detailAsset from "@/assets/landing/event_detail.png.asset.json";
import dashboardAsset from "@/assets/landing/dashboard.png.asset.json";
import gestionAsset from "@/assets/landing/gestion_eventos.png.asset.json";

export const SHOTS = {
  feed: feedAsset.url,
  detail: detailAsset.url,
  dashboard: dashboardAsset.url,
  gestion: gestionAsset.url,
} as const;
