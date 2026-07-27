// Canonical share URL for an event.
//
// Per-event Open Graph tags are served by the Cloudflare Worker in
// `cloudflare/event-og-worker.js`, which sits in front of zentro.today and
// answers crawler requests to /event/* with real per-event OG HTML (sourced
// from the `event-preview` edge function). Humans get the normal SPA.
//
// Until that Worker is deployed, links still resolve correctly and fall back
// to the sitewide preview in index.html.

const SITE = "https://zentro.today";

export function getEventShareUrl(eventId: string, promoterCode?: string): string {
  const base = `${SITE}/event/${eventId}`;
  return promoterCode ? `${base}?p=${encodeURIComponent(promoterCode)}` : base;
}
