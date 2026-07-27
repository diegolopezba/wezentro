# Per-event social link previews (Cloudflare Worker)

Shared links show the event's own name, date, location and photo on
WhatsApp / iMessage / Facebook / Telegram.

## Live setup (already deployed)

- **Worker:** `zentro-og` (source: `cloudflare/event-og-worker.js`)
- **Custom Domain:** `link.zentro.today` -> `zentro-og`
- **Share URL shape:** `https://link.zentro.today/event/<event-id>`
  - crawler user agent -> per-event OG HTML (`text/html`, `X-Zentro-Preview: worker`)
  - real visitor -> `302` to `https://zentro.today/event/<event-id>` (query string preserved)
- **Image proxy shape:** `https://link.zentro.today/og-image/<event-id>.jpg`
  - returns the event image as crawler-safe `image/jpeg`
- `og:url` points at the shared `link.zentro.today` URL so social platforms cache the correct preview object.
- `<link rel=canonical>` points at `https://zentro.today/event/<id>` for the public app page.

## Why a Worker, and why on a subdomain

- The app is a client-rendered SPA — crawlers only read the static
  `index.html` head, which has one sitewide preview.
- The `event-preview` Supabase edge function *does* generate correct per-event
  OG HTML, but Supabase serves every function response on `*.supabase.co` as
  `content-type: text/plain` with `content-security-policy: default-src 'none';
  sandbox`. Crawlers refuse to parse that. Not overridable from function code.
- A Worker **route** on `zentro.today/event/*` does **not** work: `zentro.today`
  is orange-to-orange (our Cloudflare zone proxies to Lovable, which is itself
  behind Cloudflare). In O2O, route matching uses the SaaS provider's hostname,
  so customer-zone routes on the customer hostname never fire. Verified: the
  route was created successfully and never executed.
  See <https://github.com/cloudflare/workers-sdk/issues/11270>.
- A Worker **Custom Domain** (`link.zentro.today`) bypasses route matching and
  always executes. That is what's deployed.

## Redeploying after editing the Worker

```bash
curl -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/zentro-og" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2025-01-01"};type=application/json' \
  -F 'worker.js=@cloudflare/event-og-worker.js;filename=worker.js;type=application/javascript+module'
```

## Verify

```bash
# per-event OG tags
curl -sS -A "facebookexternalhit/1.1" https://link.zentro.today/event/<id> | grep 'og:'

# crawler-safe OG image
curl -sSI https://link.zentro.today/og-image/<id>.jpg

# humans get redirected to the canonical app URL
curl -sSI -A "Mozilla/5.0" https://link.zentro.today/event/<id>
```

Then run the URL through <https://developers.facebook.com/tools/debug/> and
share it into a WhatsApp chat from a real phone.

## Notes

- WhatsApp/Facebook cache previews **per URL**. After changing an event image,
  re-scrape in the Sharing Debugger or the old preview persists.
- Promoter codes (`?p=...`) pass through to the preview endpoint and to the
  human redirect target.
- If the edge function fails, the Worker still redirects to the app — a preview
  failure can never break the link.
- Event images are transformed to 1200×630 JPEG and proxied from `link.zentro.today`,
  because some social apps fail or cache badly with WebP previews or storage-hosted images.
