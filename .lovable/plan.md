## What the screenshots show

Cloudflare has 4 DNS records for `zentro.today`:

| Name | Type | Content | Proxy |
|---|---|---|---|
| zentro.today | A | 185.158.133.1 | Proxied (orange) |
| _domainconnect | CNAME | _domainconnect.gd.domaincontrol.com | Proxied |
| _dmarc | TXT | DMARC policy | DNS only |
| link.zentro.today | Worker | zentro-og | Proxied |

Two problems:

1. **The `_lovable` TXT verification record is missing.** Lovable asks for `_lovable` = `lovable_verify=72979cf418db29ca314ad73bbf2d074e98f873546af30e6b7c162b021eb4f19b`, and it is not in the Cloudflare list. Without it, Lovable marks the domain Offline.
2. **The root A record is Proxied.** Live check of `https://zentro.today/` returns HTTP 421 (misdirected request) from Cloudflare, which is the classic symptom of proxying an orange-cloud A record straight at Lovable's edge without proxy mode configured on the Lovable side.

`link.zentro.today` (the preview Worker) is fine and unaffected.

## Fix

### Step 1 — Add the missing verification record in Cloudflare
- DNS -> Add record
- Type: `TXT`
- Name: `_lovable`
- Content: `lovable_verify=72979cf418db29ca314ad73bbf2d074e98f873546af30e6b7c162b021eb4f19b`
- Proxy: not applicable for TXT
- Save

### Step 2 — Turn the root A record to DNS only
- Edit the `zentro.today` A record (`185.158.133.1`)
- Click the orange cloud so it becomes grey: **DNS only**
- Save

This removes the double-proxy (orange-to-orange) layer that is producing the 421 and lets Lovable serve and issue SSL directly.

### Step 3 — Add www (optional but recommended)
`www.zentro.today` currently does not exist at all.
- In Lovable Domains, add `www.zentro.today` as a second domain
- In Cloudflare add: `A` / `www` / `185.158.133.1` / DNS only

### Step 4 — Recover in Lovable
- Project Settings -> Project -> Domains
- Press **Recover** on `zentro.today`
- Wait for status to move from Verifying -> Setting up -> Active

### Step 5 — Verify
Once Lovable shows Active, confirm:
- `https://zentro.today/` returns HTTP 200 instead of 421
- `https://link.zentro.today/event/<id>` still returns preview HTML for crawlers and redirects real visitors to `zentro.today`

## Meanwhile

The app itself is healthy and reachable at `https://wezentro.lovable.app` — use that link while DNS is being repaired.

## Note on the Worker

Keeping the root A record DNS-only does not break `link.zentro.today`. The Worker is bound as a Custom Domain on its own subdomain and runs independently of the root record's proxy setting.