# Fix signup rate limits for 5K user surge

## Root cause

Auth email domain `hello.zentro.today` is verified, and shared email infrastructure (queues, cron, send log) is already provisioned. However, `supabase/functions/auth-email-hook/index.ts` is still on the **old synchronous pattern** — it imports `@lovable.dev/email-js` and sends every confirmation email inline via `callback_url`.

That path is capped by Supabase's built-in auth email sender at roughly **30 emails/hour project-wide and 1 email/60s per address**. That is exactly what the logs show: every `/signup` is returning `429 over_email_send_rate_limit`. Real users see "algo salió mal" and bounce.

The new queued pattern enqueues into pgmq `auth_emails`, then `process-email-queue` drains it at ~120 emails/min using your own verified domain — well above 5K signups in a day.

## Plan

1. **Upgrade the auth email hook to the queued pipeline**
   - Re-scaffold the six auth templates + `auth-email-hook` with overwrite enabled. This replaces the old `@lovable.dev/email-js` direct-send code with the new `enqueue_email` version that uses pgmq + the existing `process-email-queue` cron.
   - Re-apply Zentro brand styling (dark theme, Pinterest red `#E60023`, Poppins) to the regenerated templates, keeping email body background white per email best practice.
   - Deploy `auth-email-hook` so Supabase Auth starts handing emails to the queue immediately.

2. **Verify the live pipeline**
   - Confirm `process-email-queue` cron is active on Live (this is what makes prod actually drain the queue — separate from dev).
   - Check `email_send_log` after first real signup to confirm rows land as `pending` → `sent`.

3. **No frontend changes needed**
   - The friendly-error mapping + 60s "Reenviar correo" cooldown shipped last turn already covers the residual per-address gate.
   - Onboarding 13+ age gate and duplicate-username handling already in place.

## Technical details

- File touched by scaffolder: `supabase/functions/auth-email-hook/index.ts` and templates under `supabase/functions/_shared/email-templates/*.tsx`.
- Deploy target: `auth-email-hook` (process-email-queue is already deployed).
- No DB migration required — `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` RPCs and pgmq queues already exist.
- No env changes required — `SENDER_DOMAIN = hello.zentro.today` is correct.
- If Live cron is missing post-publish, re-publish triggers the OnPublish hook to provision prod cron + Vault secret.

## Out of scope

- Switching to a third-party email provider (would conflict with NS delegation, slower to ship).
- Touching Supabase auto-confirm or disabling email confirmation (security regression, not asked for).
