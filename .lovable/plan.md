# Fix event link previews — real root cause

## What I verified just now

- The edge function works: it returns correct per-event title, `location · date`, and the event's own image for a real event id.
- **But Supabase refuses to serve it as HTML.** The response comes back with `content-type: text/plain` and `content-security-policy: default-src 'none'; sandbox` — a platform anti-phishing rule on `*.supabase.co/functions/*`. WhatsApp/Facebook/iMessage never parse it as a document, so no preview. This cannot be overridden from function code.
- `https://zentro.today/event/:id` still serves the static SPA head: generic title and a **relative** `og:image` (`/og-image.png`), which several scrapers reject outright.
- Your DNS: nameservers are GoDaddy (`ns37/38.domaincontrol.com`), root `A → 185.158.133.1` (Lovable). No `www` record exists. There is no Cloudflare account of yours in the path today.

Conclusion: the OG HTML has to be served from a host we control that returns real `text/html`. Two viable routes.

## Option A (recommended) — Cloudflare in front of zentro.today

Shared links stay exactly `https://zentro.today/event/:id`.

1. You create a free Cloudflare account, add `zentro.today`, and switch the nameservers at GoDaddy to Cloudflare's (Cloudflare imports the existing records automatically).
2. In Lovable's domain settings, reconnect the domain with **Advanced → "Domain uses Cloudflare or a similar proxy"** so verification uses CNAME instead of the A record.
3. I give you a ~60-line Cloudflare Worker, deployed on the route `zentro.today/event/*`:
   - Non-crawler traffic → passthrough to Lovable, unchanged.
   - Crawler user agents (`facebookexternalhit`, `WhatsApp`, `Twitterbot`, `TelegramBot`, `Discordbot`, `Slackbot`, `LinkedInBot`, `iMessage`/`Applebot`, `Pinterest`) → the Worker fetches the existing `event-preview` function (its JSON/HTML body is fine to read server-side) and returns proper `text/html` with the per-event OG tags.
4. I revert share links back to the canonical `https://zentro.today/event/:id`.

Result: canonical URLs, correct previews everywhere, and the preview URL is the same URL people land on.

## Option B — share subdomain, no nameserver migration

Shared links become `https://l.zentro.today/event/:id`, which 302s humans to the app.

1. Deploy a tiny preview responder (Deno Deploy or Vercel, free tier) that serves the same HTML the edge function already generates.
2. At GoDaddy: one `CNAME l → <host target>` (plus a TXT verification record the host issues).
3. `src/lib/shareLinks.ts` points at `https://l.zentro.today/event/:id`.

Faster to set up, but shared links no longer read as your bare domain.

## Applies to either option (I'll do this regardless)

- `index.html`: make `og:image` absolute (`https://zentro.today/og-image.png`) and add the missing `og:url`, `twitter:card`, `twitter:image` so the sitewide fallback preview is valid.
- Keep the existing `event-preview` function — under Option A it becomes the Worker's data source; under Option B it's replaced by the new host.
- Verification: Facebook Sharing Debugger on a real event URL + a real WhatsApp share. Caching is per-URL, so a changed event image needs a manual re-scrape.

## What I need from you

Pick Option A or B. Option A needs you to do the Cloudflare signup + nameserver switch at GoDaddy (I'll give exact steps and the Worker code); Option B needs you to create one host account and add a CNAME. Everything inside the repo I do.
