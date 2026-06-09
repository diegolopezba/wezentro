// Public unfurl endpoint: serves per-event OG/Twitter meta HTML to social
// crawlers (WhatsApp, iMessage, Twitter, FB, Slack, Discord, LinkedIn, etc.)
// and 302-redirects normal browsers straight to the real app route.
//
// URL shape: /functions/v1/event-share/<eventId>
// No JWT required.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APP_ORIGIN = "https://zentro.today";
const DEFAULT_TITLE = "Zentro - El pinterest de la vida social";
const DEFAULT_DESC =
  "Descubre y únete a los mejores eventos de vida nocturna en tu ciudad.";
const DEFAULT_IMAGE = `${APP_ORIGIN}/og-image.png`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function optimizeImage(url: string | null | undefined): string {
  if (!url) return DEFAULT_IMAGE;
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) return DEFAULT_IMAGE;
  if (!url.includes("/storage/v1/object/public/")) return url;
  const base = url.split("?")[0];
  return `${base}?width=1200&quality=80&resize=cover`;
}

function buildHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
}): string {
  const { title, description, image, url } = opts;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const u = escapeHtml(url);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />

<meta property="og:type" content="event" />
<meta property="og:site_name" content="Zentro" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${u}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:secure_url" content="${img}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${img}" />
</head>
<body>
<p><a href="${u}">${t}</a></p>
</body>
</html>`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-BO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

const BOT_RE =
  /(facebookexternalhit|facebookcatalog|Facebot|WhatsApp|Twitterbot|Slackbot|Slack-ImgProxy|Discordbot|TelegramBot|LinkedInBot|Applebot|iMessagePreview|SkypeUriPreview|redditbot|Embedly|quora link preview|Pinterest|Snapchat|vkShare|W3C_Validator|Googlebot|bingbot|DuckDuckBot|YandexBot|baiduspider|Mastodon|Bluesky|Threads|Iframely|preview|bot|crawler|spider)/i;

function isBot(ua: string | null): boolean {
  if (!ua) return true; // no UA = treat as crawler (safer for unfurls)
  return BOT_RE.test(ua);
}

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function redirectResponse(to: string) {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: to,
      "Cache-Control": "no-store",
    },
  });
}

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const fromPath = url.pathname.match(UUID_RE)?.[0];
  const fromQuery = url.searchParams.get("id");
  const eventId = (fromPath || fromQuery || "").toLowerCase();
  const ua = req.headers.get("user-agent");
  const bot = isBot(ua);

  if (!eventId || !UUID_RE.test(eventId)) {
    if (!bot) return redirectResponse(APP_ORIGIN);
    return htmlResponse(
      buildHtml({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESC,
        image: DEFAULT_IMAGE,
        url: APP_ORIGIN,
      }),
    );
  }

  const redirectTo = `${APP_ORIGIN}/event/${eventId}`;

  // Humans: skip the DB hit, redirect straight to the SPA.
  if (!bot) return redirectResponse(redirectTo);

  try {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, description, image_url, location_name, start_datetime, is_public, deleted_at",
      )
      .eq("id", eventId)
      .maybeSingle();

    if (error || !data || data.deleted_at || data.is_public === false) {
      return htmlResponse(
        buildHtml({
          title: DEFAULT_TITLE,
          description: DEFAULT_DESC,
          image: DEFAULT_IMAGE,
          url: redirectTo,
        }),
      );
    }

    const title = (data.title || "Evento en Zentro").trim();
    const when = formatWhen(data.start_datetime);
    const loc = (data.location_name || "").trim();
    const descBits = [loc, when].filter(Boolean).join(" • ");
    const description =
      descBits ||
      (data.description ? data.description.slice(0, 160) : DEFAULT_DESC);

    return htmlResponse(
      buildHtml({
        title,
        description,
        image: optimizeImage(data.image_url),
        url: redirectTo,
      }),
    );
  } catch {
    return htmlResponse(
      buildHtml({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESC,
        image: DEFAULT_IMAGE,
        url: redirectTo,
      }),
    );
  }
});
