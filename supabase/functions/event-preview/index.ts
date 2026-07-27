// Public per-event Open Graph preview page.
// Social crawlers (WhatsApp, facebookexternalhit, Twitterbot, TelegramBot, iMessage)
// don't run JS, so the SPA's client-side meta tags never reach them. This function
// returns a tiny standalone HTML document with real per-event OG tags and
// instantly redirects real visitors to the app.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

const SITE = "https://zentro.today";
const SHARE_SITE = "https://link.zentro.today";
const GENERIC_TITLE = "Zentro - El pinterest de la vida social";
const GENERIC_DESC =
  "Descubre y únete a los mejores eventos de vida nocturna en tu ciudad.";
const GENERIC_IMAGE = `${SITE}/og-image.png`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("es-BO", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/La_Paz",
    }).format(d);
  } catch {
    return null;
  }
}

function truncate(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function normalizeCrawlerImage(input: string | null | undefined): string {
  if (!input) return GENERIC_IMAGE;

  try {
    const image = new URL(input);
    const path = image.pathname.toLowerCase();

    if (/\.(mp4|mov|m4v|webm)$/.test(path)) {
      return GENERIC_IMAGE;
    }

    if (image.pathname.includes("/storage/v1/object/public/")) {
      image.pathname = image.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/",
      );
      image.searchParams.set("width", "1200");
      image.searchParams.set("height", "630");
      image.searchParams.set("resize", "cover");
      image.searchParams.set("quality", "80");
      return image.toString();
    }

    if (/\.(jpe?g|png|gif|webp)(\?.*)?$/.test(input)) {
      return input;
    }
  } catch {
    return GENERIC_IMAGE;
  }

  return GENERIC_IMAGE;
}

function renderPage(opts: {
  title: string;
  description: string;
  image: string;
  previewUrl: string;
  canonicalUrl: string;
  redirectTo: string;
}): string {
  const title = escapeHtml(opts.title);
  const description = escapeHtml(opts.description);
  const image = escapeHtml(opts.image);
  const previewUrl = escapeHtml(opts.previewUrl);
  const canonicalUrl = escapeHtml(opts.canonicalUrl);
  const redirect = escapeHtml(opts.redirectTo);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />

    <meta property="og:site_name" content="Zentro" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${previewUrl}" />
    <meta property="og:type" content="website" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />

    <link rel="canonical" href="${canonicalUrl}" />
    <meta http-equiv="refresh" content="0;url=${redirect}" />
    <style>
      html,body{margin:0;height:100%;background:#0A0A0B;color:#FAFAFA;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        display:flex;align-items:center;justify-content:center}
      a{color:#E60023;text-decoration:none;font-weight:600}
    </style>
  </head>
  <body>
    <a href="${redirect}">Continue to Zentro</a>
    <script>window.location.replace(${JSON.stringify(opts.redirectTo)});</script>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const htmlHeaders = {
    ...corsHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  };

  const fallback = () =>
    new Response(
      renderPage({
        title: GENERIC_TITLE,
        description: GENERIC_DESC,
        image: GENERIC_IMAGE,
        previewUrl: `${SHARE_SITE}/`,
        canonicalUrl: `${SITE}/`,
        redirectTo: `${SITE}/`,
      }),
      { status: 200, headers: htmlHeaders },
    );

  try {
    const url = new URL(req.url);
    // /functions/v1/event-preview/:eventId
    const segments = url.pathname.split("/").filter(Boolean);
    const eventId = segments[segments.length - 1];

    if (!eventId || eventId === "event-preview" || !UUID_RE.test(eventId)) {
      console.log("[event-preview] invalid id:", eventId);
      return fallback();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.log("[event-preview] missing backend env");
      return fallback();
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: event, error } = await supabase
      .from("events")
      .select("id, title, description, image_url, location_name, start_datetime, deleted_at")
      .eq("id", eventId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) console.log("[event-preview] event query error:", error.message);
    if (error || !event) {
      console.log("[event-preview] event not found:", eventId);
      return fallback();
    }

    const { data: media } = await supabase
      .from("event_media")
      .select("media_url")
      .eq("event_id", eventId)
      .eq("media_type", "image")
      .order("display_order", { ascending: true })
      .limit(1);

    const image = normalizeCrawlerImage(
      media?.[0]?.media_url || event.image_url || GENERIC_IMAGE,
    );

    const when = formatDate(event.start_datetime);
    const place = event.location_name?.trim() || null;
    const parts = [place, when].filter(Boolean) as string[];
    const description = parts.length
      ? truncate(parts.join(" · "))
      : truncate(event.description || GENERIC_DESC);

    const eventUrl = `${SITE}/event/${event.id}`;
    const shareUrl = `${SHARE_SITE}/event/${event.id}`;
    // Preserve promoter attribution / any extra query params on the redirect.
    const extra = url.search ? url.search : "";

    return new Response(
      renderPage({
        title: truncate(event.title || GENERIC_TITLE, 90),
        description,
        image,
        previewUrl: `${shareUrl}${extra}`,
        canonicalUrl: eventUrl,
        redirectTo: `${eventUrl}${extra}`,
      }),
      { status: 200, headers: htmlHeaders },
    );
  } catch (e) {
    console.log("[event-preview] unexpected error:", String(e));
    return fallback();
  }
});
