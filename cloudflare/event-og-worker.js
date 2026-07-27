/**
 * Zentro — per-event social link previews.
 *
 * Why this exists
 * ---------------
 * zentro.today is a client-rendered SPA, so crawlers only ever see the static
 * index.html head. The Supabase edge function `event-preview` generates the
 * correct per-event OG HTML, but Supabase forcibly serves it as `text/plain`
 * with a sandbox CSP, so crawlers ignore it.
 *
 * Why it runs on link.zentro.today and not zentro.today
 * -----------------------------------------------------
 * zentro.today is an "orange-to-orange" (O2O) setup: our Cloudflare zone
 * proxies to Lovable, which is itself behind Cloudflare. In O2O, Worker routes
 * on the customer zone never match the customer hostname, so a route on
 * `zentro.today/event/*` silently never fires. `link.zentro.today` is a Worker
 * Custom Domain, which bypasses route matching entirely and always executes.
 *
 * Behaviour on link.zentro.today/event/:id
 *   - crawler user agents -> per-event OG HTML (real text/html)
 *   - everyone else       -> 302 to https://zentro.today/event/:id
 * Anything else -> 302 to the equivalent path on zentro.today.
 */

const APP_ORIGIN = "https://zentro.today";
const SHARE_ORIGIN = "https://link.zentro.today";

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

function escapeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toCrawlerSafeImageUrl(raw) {
  try {
    const image = new URL(raw.replace(/&amp;/g, "&"));
    if (!image.pathname.includes("/storage/v1/object/public/")) return raw;

    image.pathname = image.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    );
    image.searchParams.set("width", "1200");
    image.searchParams.set("height", "630");
    image.searchParams.set("resize", "cover");
    image.searchParams.set("quality", "80");
    return escapeAttr(image.toString());
  } catch {
    return raw;
  }
}

function hardenPreviewHtml(html, shareUrl) {
  const escapedShareUrl = escapeAttr(shareUrl);
  let next = html.replace(
    /https:\/\/fipdpcitsjpqivljrktj\.supabase\.co\/storage\/v1\/object\/public\/event-images\/[^"'<>\s]+/g,
    (raw) => toCrawlerSafeImageUrl(raw),
  );

  next = next.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapedShareUrl}" />`,
  );

  if (!next.includes('property="og:image:type"')) {
    next = next.replace(
      /(<meta property="og:image:secure_url" content="[^"]*"\s*\/?>)/,
      `$1\n    <meta property="og:image:type" content="image/jpeg" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />`,
    );
  }

  return next;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    const match = url.pathname.match(/^\/event\/([^/?#]+)/);
    const eventId = match ? match[1] : null;

    const appUrl = `${APP_ORIGIN}${url.pathname}${url.search}`;
    const shareUrl = `${SHARE_ORIGIN}${url.pathname}${url.search}`;
    const redirectToApp = () =>
      Response.redirect(appUrl, 302);

    // Not an event page, or a real human: send them to the app.
    if (!eventId || !UUID_RE.test(eventId) || !CRAWLER_RE.test(ua)) {
      return redirectToApp();
    }

    try {
      const upstream = await fetch(
        `${PREVIEW_ENDPOINT}/${eventId}${url.search}`,
        { headers: { "user-agent": "zentro-og-worker" } },
      );

      if (!upstream.ok) return redirectToApp();

      const html = hardenPreviewHtml(await upstream.text(), shareUrl);
      if (!html.includes("og:title")) return redirectToApp();

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "X-Zentro-Preview": "worker",
        },
      });
    } catch (err) {
      // Never break the link for a preview failure.
      return redirectToApp();
    }
  },
};
