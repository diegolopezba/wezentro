## Fastest path: give me a scoped Cloudflare API token

The token route is faster (about 2 minutes of your time, then I do everything and verify). The dashboard route needs ~6 manual steps from you and I still can't see the result of each click.

### What you do (once)

1. Cloudflare dashboard → profile icon (top right) → **API Tokens** → **Create Token** → **Create Custom Token**.
2. Name it `zentro-og-worker`.
3. Permissions — add these three rows:
   - Account → **Workers Scripts** → Edit
   - Zone → **Workers Routes** → Edit
   - Zone → **Zone** → Read
4. Account Resources: your account. Zone Resources: **Include → Specific zone → zentro.today**.
5. Continue → Create Token → copy it.
6. Paste it to me here. I'll immediately store it as a project secret (not in code, never echoed).

I also need your Cloudflare **Account ID** — it's on the right sidebar of the zentro.today overview page.

### What I then do

1. Store the token as a secret.
2. Upload `cloudflare/event-og-worker.js` as a Worker script named `zentro-og` via the Cloudflare API.
3. Create the route `zentro.today/event/*` bound to that Worker on the zentro.today zone.
4. Verify from here:
   - `curl -A "facebookexternalhit/1.1" https://zentro.today/event/<real-id>` must return real `og:title` / `og:image` / `og:description` for that event, with `content-type: text/html`.
   - A normal browser request to the same URL must return the unchanged SPA (no redirect, no regression).
   - Confirm `?p=<promoter-code>` still passes through on both paths.
5. Report the results, then you run one real WhatsApp share from your phone and one pass through the Facebook Sharing Debugger to clear their caches.

### Technical notes

- The Worker code and setup notes already exist in the repo (`cloudflare/event-og-worker.js`, `cloudflare/README.md`); no app code changes are needed.
- Share links stay canonical: `https://zentro.today/event/:id`. `src/lib/shareLinks.ts` is already pointing there.
- The Worker only intercepts known crawler user agents on `/event/<uuid>`; anything else, or any upstream failure, falls straight through to the normal app, so a preview problem can never break the page.
- OG data still comes from the existing `event-preview` edge function — the Worker just re-serves its HTML with a correct `text/html` content type from your own domain, which is the part Supabase blocks.
- Previews are cached per URL by WhatsApp/Facebook; changing an event image later needs a manual re-scrape.

### Fallback

If you'd rather not create a token, say so and I'll give you the click-by-click dashboard version instead (Workers & Pages → Create Worker → paste file → Deploy → Settings → Triggers → Add route `zentro.today/event/*`), and I'll still run the verification from here afterwards.
