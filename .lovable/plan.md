# Stabilize the Para Ti feed

## Changes
- Keep the server-ranked `assemble-for-you-slate` response as the primary feed.
- Retry brief infrastructure failures before falling back.
- Remove the obsolete `get-for-you-feed` and direct `get_for_you_events` client fallbacks that currently produce repeated 500/404 errors.
- Fall back to a direct read of public, non-deleted content so a temporary ranking-service failure does not blank the home page.
- Make `assemble-for-you-slate` read candidates directly if its ranking database function is unavailable, while preserving the existing ranking and response shape.
- Return useful JSON error details instead of `[object Object]`.

## Verification
- Deploy the updated feed function.
- Smoke-test the ranked response and the app feed.
- Confirm transient failures no longer lead to a blank screen or calls to the obsolete endpoint.
