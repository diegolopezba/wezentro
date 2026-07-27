## Plan

1. **Confirm the app is sharing the correct URL everywhere**
   - Re-check the share modal, three-dot share action, promoter links, WhatsApp links, copy-link flow, and native share flow.
   - Ensure external shares use `https://link.zentro.today/event/:id` and in-app navigation keeps `https://zentro.today/event/:id`.

2. **Fix the “server can’t be found” click behavior**
   - Verify the Worker Custom Domain is still active and that human clicks return a valid redirect to the canonical app URL.
   - If the app is still sharing an old/unpublished URL, update the share helper and all call sites so the published frontend uses the live Worker domain.

3. **Fix missing images in social previews**
   - Current crawler HTML returns the event title and image, but the image URL is a `.webp` file from backend storage.
   - Some platforms, especially WhatsApp/iMessage/Facebook preview cache paths, can fail or cache badly with WebP previews.
   - Update the preview pipeline to prefer a crawler-safe JPEG/PNG OG image when available, and fall back cleanly to the generic Zentro image if not.

4. **Add stronger verification**
   - Test crawler requests against a real event URL and confirm:
     - HTTP 200
     - `content-type: text/html`
     - real `og:title`
     - real `og:image`
     - `X-Zentro-Preview: worker`
   - Test human clicks and confirm they redirect to `https://zentro.today/event/:id`.
   - Test with query params like `?p=promoter-code` to preserve promoter attribution.

5. **Tell you exactly what must be refreshed manually**
   - Social apps cache previews per URL. After the fix, old WhatsApp/Facebook previews may not change until re-scraped or shared as a fresh URL.
   - I’ll give you the exact URL to paste into Facebook Sharing Debugger and what result to expect.