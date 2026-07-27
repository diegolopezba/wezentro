/**
 * Zentro — per-event social link previews.
 *
 * Why this exists: zentro.today is a client-rendered SPA, so crawlers only ever
 * see the static index.html head. The Supabase edge function `event-preview`
 * generates correct per-event OG HTML, but Supabase forcibly serves it as
 * `text/plain` with a sandbox CSP, so crawlers ignore it.
 *
 * This Worker sits on the route `zentro.today/event/*`:
 *   - crawler user agents  -> fetch the edge function, re-serve its body as real text/html
 *   - everyone else        -> pass straight through to the Lovable origin
 *
 * Deploy:
 *   1. Cloudflare dashboard -> Workers & Pages -> Create Worker -> paste this file.
 *   2. Worker -> Settings -> Triggers -> Add route: `zentro.today/event/*`
 *      (zone: zentro.today, must be on Cloudflare nameservers).
 *   3. Verify: https://developers.facebook.com/tools/debug/ on an event URL.
 */

const PREVIEW_ENDPOINT =
  "https://fipdpcitsjpqivljrktj.supabase.co/functions/v1/event-preview";

const CRAWLER_RE = new RegExp(
  [
    "facebookexternalhit",
    "facebookcatalog",
    "WhatsApp",
    "Twitterbot",
    "TelegramBot",
    "Discordbot",
    "Slackbot",
    "Slack-ImgProxy",
    "LinkedInBot",
    "Applebot",
    "Pinterest",
    "redditbot",
    "SkypeUriPreview",
    "vkShare",
    "Googlebot",
    "bingbot",
    "Iframely",
    "embedly",
  ].join("|"),
  "i",
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    const match = url.pathname.match(/^\/event\/([^/?#]+)/);
    const eventId = match ? match[1] : null;

    // Not an event page, or a real human: let the app serve it.
    if (!eventId || !UUID_RE.test(eventId) || !CRAWLER_RE.test(ua)) {
      return fetch(request);
    }

    try {
      const upstream = await fetch(
        `${PREVIEW_ENDPOINT}/${eventId}${url.search}`,
        { headers: { "user-agent": "zentro-og-worker" } },
      );

      if (!upstream.ok) return fetch(request);

      const html = await upstream.text();
      if (!html.includes("og:title")) return fetch(request);

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "X-Zentro-Preview": "worker",
        },
      });
    } catch (err) {
      // Never break the page for a preview failure.
      return fetch(request);
    }
  },
};
