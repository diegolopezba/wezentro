// Links shared OUTSIDE the app must point at the edge preview endpoint so
// social crawlers (WhatsApp, iMessage, Facebook, Telegram) get real per-event
// Open Graph tags. Real visitors are redirected to /event/:id immediately.
// In-app sharing (chat invites) keeps using the direct route.

const PREVIEW_BASE =
  "https://fipdpcitsjpqivljrktj.supabase.co/functions/v1/event-preview";

export function getEventShareUrl(eventId: string, promoterCode?: string): string {
  const base = `${PREVIEW_BASE}/${eventId}`;
  return promoterCode ? `${base}?p=${encodeURIComponent(promoterCode)}` : base;
}
