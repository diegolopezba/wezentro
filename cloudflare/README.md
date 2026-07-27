# Per-event social link previews (Cloudflare Worker)

Shared links like `https://zentro.today/event/<id>` should show the event's own
name, date, location and photo on WhatsApp / iMessage / Facebook / Telegram.

## Why a Worker is required

- The app is a client-rendered SPA — crawlers only ever read the static
  `index.html` head, which has one sitewide preview.
- The `event-preview` Supabase edge function *does* generate correct per-event
  OG HTML, but Supabase serves every function response on `*.supabase.co` as
  `content-type: text/plain` with `content-security-policy: default-src 'none';
  sandbox`. Crawlers refuse to parse that as a document. This cannot be
  overridden from function code.

So the OG HTML must be re-served as real `text/html` from our own domain.
`cloudflare/event-og-worker.js` does exactly that.

## One-time setup

1. **Cloudflare account** (free): add the site `zentro.today`. Cloudflare will
   import the existing DNS records — confirm the root `A` record
   `185.158.133.1` (Lovable) is present and **proxied (orange cloud)**.
2. **GoDaddy**: change the nameservers for `zentro.today` from
   `ns37/ns38.domaincontrol.com` to the two Cloudflare nameservers shown in the
   Cloudflare onboarding. Propagation is usually under an hour.
3. **Lovable**: Project Settings → Domains → reconnect `zentro.today` with
   **Advanced → "Domain uses Cloudflare or a similar proxy"** checked, so
   verification uses CNAME instead of the A record.
4. **Worker**: Cloudflare → Workers & Pages → Create Worker → paste
   `event-og-worker.js` → Deploy.
5. **Route**: Worker → Settings → Triggers → Add route
   `zentro.today/event/*` (zone `zentro.today`).

## Verify

```bash
# Should return real per-event og:title / og:image
curl -sS -A "facebookexternalhit/1.1" https://zentro.today/event/<event-id> | grep 'og:'

# Should return the normal SPA
curl -sSI https://zentro.today/event/<event-id>
```

Then run the URL through <https://developers.facebook.com/tools/debug/> and
share it into a WhatsApp chat from a real phone.

## Notes

- WhatsApp/Facebook cache previews **per URL**. After changing an event image,
  re-scrape in the Sharing Debugger or the old preview persists.
- Promoter codes (`?p=...`) are passed through to the preview endpoint and to
  the human redirect target.
- If the Worker or the edge function fails for any reason, the request falls
  through to the normal app — previews degrade to the sitewide Zentro card,
  the page never breaks.
