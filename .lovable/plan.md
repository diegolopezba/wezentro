## Why no preview shows up

WhatsApp, iMessage, Telegram, etc. **follow `<meta http-equiv="refresh">` redirects** before reading OG tags. Our `event-share` function returns the right OG tags but also includes:

```html
<meta http-equiv="refresh" content="0; url=https://zentro.today/event/...">
<script>window.location.replace(...)</script>
```

So the crawler instantly bounces to `zentro.today/event/:id`, which is the React SPA whose `index.html` only has the generic Zentro OG tags. End result: no per-event preview (or a generic Zentro card at best).

Native sharing makes this worse because some OS share sheets pre-resolve the URL through the same redirect before handing it to the target app.

## Fix

Change `supabase/functions/event-share/index.ts` so crawlers see only the OG tags, and humans get redirected via JS:

1. **Detect crawler user-agents** (`facebookexternalhit`, `WhatsApp`, `Twitterbot`, `Slackbot`, `Discordbot`, `TelegramBot`, `LinkedInBot`, `iMessagePreview`/`Applebot`, `SkypeUriPreview`, `redditbot`, `embedly`, `quora link preview`, etc.). For these:
   - Return the per-event HTML **without** `<meta http-equiv="refresh">` and **without** any redirect script.
   - Keep `og:*` and `twitter:*` tags, canonical link, `Cache-Control: public, max-age=300`.
2. **Humans (everyone else)**:
   - Respond with an HTTP `302` redirect straight to `https://zentro.today/event/:eventId` (faster + avoids the white flash, no JS required, works inside in-app browsers).
   - This also fixes the case where the native share sheet pre-resolves the URL — it just lands on the real page.

No other code changes needed. `ShareEventModal` keeps pointing at the edge-function URL.

## Validation

After deploy, verify with curl (these should return full OG HTML, no redirect):

```text
curl -A "facebookexternalhit/1.1" .../event-share/<id>
curl -A "WhatsApp/2.23" .../event-share/<id>
curl -A "Twitterbot/1.0" .../event-share/<id>
```

And a plain browser UA should return `302 Location: https://zentro.today/event/<id>`.

Then re-test by pasting a fresh share link into WhatsApp Web / iMessage (note: WhatsApp caches by URL for ~7 days, so test with an event you haven't shared yet, or add a `?v=2` query). Confirm event name + image render.

## Out of scope

- SSR migration, profile/guestlist unfurls, custom-domain rewrite from `zentro.today/s/event/:id` → edge function (can be added later if you want to hide the `supabase.co` URL).
