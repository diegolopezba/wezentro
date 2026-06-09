## Root cause

Even though our custom `auth-email-hook` is healthy and queuing emails through `hello.zentro.today` at ~120/min, Supabase Auth enforces its **own project-level email rate limit** (default ~30 emails/hour) on `/signup` and `/recover` *before* the hook is invoked. The auth logs from the last few minutes confirm this — multiple users (caryto_98, davidcorona.business, vidalmar2004, nataliariveroma, etc.) are getting `429 over_email_send_rate_limit`, and the test email (zoe.e.sweaney@slu.edu) never reached `email_send_log` because Supabase rejected the request upstream.

This is why custom-hook users *think* they removed the rate limit but didn't — the hook bypasses Supabase's *sender*, not its *rate counter*.

## Plan

1. **Raise the Supabase Auth email rate limit** to a level that supports 5K signups/day (target: 1000/hr or higher). This is a single config change in `auth.rate_limit_email_sent`.
2. **Verify** by:
   - Re-checking auth logs for `over_email_send_rate_limit` — should drop to zero.
   - Asking the user to retry signup with the same email and confirming a new row appears in `email_send_log` going `pending → sent`.
3. **No code changes needed.** The hook, queue, templates, and frontend cooldown all stay as-is.

## Technical details

- The setting lives in Supabase Auth's GoTrue config under `RATE_LIMIT_EMAIL_SENT` (hourly cap on emails sent via auth flows: signup confirm, recovery, magic link, email change).
- We'll raise it from the default (30/hr) to **1000/hr**, which covers the 5K/day surge with healthy margin.
- This is a runtime config change applied via the Supabase Management API — no migration, no redeploy.
- The per-address 60s cooldown (Supabase's `EMAIL_RESEND_INTERVAL`) is separate and stays at default; that's fine for the "Reenviar" UX we already shipped.

## Out of scope

- Switching email providers.
- Disabling email confirmation (security regression, not requested).
- Touching templates or the hook (both verified working).
