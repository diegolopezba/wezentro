# Per-event social link previews

Shared event links currently show one generic Zentro preview because the app is a client-rendered SPA and preview bots never run JavaScript. Fix: a public preview endpoint that returns a tiny HTML page with real per-event Open Graph tags and instantly redirects humans to the app.

## Verified current state
- `events` has `title`, `description`, `image_url`, `location_name`, `start_datetime`, `deleted_at`.
- `event_media` has `media_url`, `media_type`, `display_order`, `event_id`.
- The only storage bucket, `event-images`, is **public**, and stored URLs are permanent `/storage/v1/object/public/...` links — no signed-token expiry work needed.
- External share URLs are built in `ShareEventModal.tsx` (line 85) and `EventActionsSheet.tsx` (line 62, copy link).

## What gets built

**1. New edge function `supabase/functions/event-preview/index.ts`**
- Public, no auth required (`verify_jwt = false`), uses the service-role client for the lookup.
- Path form: `/functions/v1/event-preview/:eventId`.
- Loads the event (`deleted_at is null`), plus the first `event_media` row with `media_type = 'image'` ordered by `display_order` ascending; that image wins, otherwise `events.image_url`, otherwise the generic `https://zentro.today/og-image.png`.
- Description: `location_name · formatted start_datetime` (Spanish date format), falling back to `description` when either is missing.
- Unknown/deleted/invalid id → generic Zentro title + og-image, redirect target `https://zentro.today/`.
- Returns HTML with `og:title`, `og:description`, `og:image` (absolute https), `og:url` → `https://zentro.today/event/:id`, `og:type`, `twitter:card=summary_large_image`, `twitter:title/description/image`.
- Body carries `<meta http-equiv="refresh" content="0;url=...">`, `window.location.replace(...)`, and a visible "Continue to Zentro" link.
- HTML-escapes all event text; short `Cache-Control` (e.g. `s-maxage=300`) so edits re-scrape reasonably fast.

**2. Share links**
- `ShareEventModal.tsx`: native share / copy-link uses `https://fipdpcitsjpqivljrktj.supabase.co/functions/v1/event-preview/${eventId}`. In-app send-to-user (chat `event_invite`) is untouched.
- `EventActionsSheet.tsx` copy-link switched to the same preview URL for consistency.
- Promoter links (`promoterAttribution.ts`) stay as-is unless you want the `?p=` code carried through — say the word and I'll pass it through the preview URL to the redirect target.

**3. Verify**
- Fetch the endpoint with curl and confirm tags render with real data.
- I'll give you the exact URL for a real event so you can run it through Facebook's Sharing Debugger and a WhatsApp share before shipping.

## Note
WhatsApp/Facebook cache previews per URL, so a preview scraped before an event image change persists until re-scraped via the debugger.
