// Share URL for an event.
//
// External shares (WhatsApp, iMessage, copy link, native share sheet) use
// `link.zentro.today`, a Cloudflare Worker Custom Domain that serves real
// per-event Open Graph HTML to social crawlers and 302s real people to the
// canonical `https://zentro.today/event/:id`.
//
// Why not zentro.today directly: that hostname is an orange-to-orange setup
// (our Cloudflare zone proxies to Lovable, which is itself behind Cloudflare),
// and in O2O, Worker routes on the customer zone never match — so a route on
// `zentro.today/event/*` silently never fires. See cloudflare/README.md.

const SITE = "https://zentro.today";
const SHARE_HOST = "https://link.zentro.today";
const SHARE_PREVIEW_VERSION = "og2";

/** Canonical in-app URL. Use for in-app navigation and chat invites. */
export function getEventUrl(eventId: string, promoterCode?: string): string {
  const base = `${SITE}/event/${eventId}`;
  return promoterCode ? `${base}?p=${encodeURIComponent(promoterCode)}` : base;
}

/** URL to share outside the app — renders a per-event link preview. */
export function getEventShareUrl(eventId: string, promoterCode?: string): string {
  const base = `${SHARE_HOST}/event/${eventId}`;
  const params = new URLSearchParams({ v: SHARE_PREVIEW_VERSION });
  if (promoterCode) params.set("p", promoterCode);
  return `${base}?${params.toString()}`;
}
