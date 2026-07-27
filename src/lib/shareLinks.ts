// Share URLs for events use the canonical app domain directly.

const SITE = "https://zentro.today";

/** Canonical in-app URL. Use for in-app navigation and chat invites. */
export function getEventUrl(eventId: string, promoterCode?: string): string {
  const base = `${SITE}/event/${eventId}`;
  return promoterCode ? `${base}?p=${encodeURIComponent(promoterCode)}` : base;
}

/** URL to share outside the app. */
export function getEventShareUrl(eventId: string, promoterCode?: string): string {
  return getEventUrl(eventId, promoterCode);
}
