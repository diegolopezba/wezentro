## Plan to undo the Cloudflare link-preview setup

Yes — we can simplify this and go back to the old setup where `zentro.today` points directly to Lovable and shared event links use the normal app URL.

### 1. Revert the app sharing code
I will change event sharing back from:

```text
https://link.zentro.today/event/<eventId>?v=og3
```

to:

```text
https://zentro.today/event/<eventId>
```

This removes the Cloudflare Worker from the app flow completely.

### 2. Remove Cloudflare-specific project files
I will remove the Cloudflare Worker files/documentation from the repo so we do not accidentally keep or redeploy the social-preview setup later.

### 3. Leave the backend preview function unused
The `event-preview` backend function can be left alone or removed later. Once the app no longer points to `link.zentro.today`, it will not affect users or sharing. Keeping it for now is safer than touching backend deployment while the live domain is being repaired.

### 4. Restore the domain outside the codebase
This part must be done in your domain/DNS accounts, not in the app code.

To disconnect Cloudflare fully and go back to how it was before:

1. In your domain registrar, change nameservers back from Cloudflare to the registrar/default nameservers.
2. In the registrar DNS, add the Lovable records:
   - `A` record for `@` / root -> `185.158.133.1`
   - TXT record `_lovable` -> the verification value shown in Lovable
3. In Lovable Project Settings -> Domains, reconnect/recover `zentro.today`.
4. Optional: add `www.zentro.today` separately in Lovable and DNS if you want the `www` version to work too.

If you prefer not to change nameservers again, the faster temporary recovery is: keep Cloudflare as DNS provider, but keep the root `zentro.today` record as **DNS only** / grey cloud and do not use `link.zentro.today`.

### 5. Verify after the DNS change
After the app code is reverted and DNS is restored, I will verify:

- `https://zentro.today/` opens the app
- `https://zentro.today/event/<eventId>` opens event pages
- event sharing no longer uses `link.zentro.today`
- the published fallback `https://wezentro.lovable.app` still works

### Important note
A full DNS nameserver revert can take time to propagate. The app should remain accessible through `https://wezentro.lovable.app` while `zentro.today` settles.