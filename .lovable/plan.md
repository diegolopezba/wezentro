## Goal

When a user shares an event link outside the app (WhatsApp, iMessage, Instagram DM, Twitter, Slack, etc.), the link unfurls with the event's name, image, date and location — like shotgun.live and dice.fm.

## The core problem

Zentro is a Vite + React SPA. Social crawlers (WhatsApp, Facebook, Twitter, iMessage, LinkedIn, Slack, Discord) do **not** execute JavaScript. They only read the static `index.html`, which today carries generic Zentro tags. That's why every event link currently previews as "Zentro - El pinterest de la vida social" with the default og-image.

`react-helmet-async` (client-side) does NOT fix this — it mutates the head after JS runs, which crawlers never see.

The fix has to run on the server and return per-event HTML before any JS.

## Approach: share-link edge function

Add a public edge function `event-share` that:

1. Receives `/functions/v1/event-share/:eventId` (or `?id=...`).
2. Queries the event from the database (title, image_url, location_name, start_datetime, description).
3. Returns a tiny HTML document whose `<head>` contains the per-event OG / Twitter tags pointing at the real image.
4. The HTML body contains a `<meta http-equiv="refresh">` + JS redirect to `https://zentro.today/event/:eventId` so humans land in the app immediately, while crawlers stop at the head and grab the preview.

Change every "Share event" surface to share that edge function URL instead of `/event/:id`:

- `src/components/events/ShareEventModal.tsx` (`handleNativeShare`)
- Any other share buttons (Profile share, copy-link buttons, etc. — to be located during build).

Deep links inside the native app keep using `/event/:id` via `useDeepLinks` because the redirect lands there.

## What each link preview will show

- og:title → event title
- og:description → location + formatted start date (fallback to event description)
- og:image → event `image_url` (already hosted on Supabase storage, public)
- og:url → canonical `https://zentro.today/event/:id`
- twitter:card → `summary_large_image`
- Same tags duplicated for Twitter

If the event is missing or unpublished, the function returns the generic Zentro OG tags (current behavior) so broken links don't look weird.

## Technical details

- New file: `supabase/functions/event-share/index.ts`. Public (no JWT). Reads `events` row via service role. Escapes title/description for safe HTML insertion. Caches response with `Cache-Control: public, max-age=300` so repeat unfurls are fast.
- Image URL passed through existing `getOptimizedImageUrl` at ~1200px wide for ideal social-preview size.
- Share URL format: `https://fipdpcitsjpqivljrktj.supabase.co/functions/v1/event-share/<eventId>` (the function URL is stable). Alternatively expose it on the custom domain via a small redirect — not needed for v1.
- Edit `ShareEventModal.handleNativeShare` to build that URL.
- No change to `index.html` (it stays as the homepage default).
- No SSR framework migration needed.

## Out of scope

- Per-route OG for non-event pages (profiles, guestlists). Same pattern can be applied later.
- Replacing the full app with SSR / Next.js.

## Validation

After build, test with:
- https://www.opengraph.xyz/ on a sample share URL
- Facebook Sharing Debugger
- Paste link into WhatsApp Web / iMessage to confirm the unfurl
