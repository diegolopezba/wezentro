
-- Server-side seen-set for feed pagination stability.
-- Lets edge functions return ordered, deduped pages so the client never has to re-rank.

CREATE TABLE public.session_feed_state (
  session_id uuid NOT NULL,
  user_id uuid NULL,
  seen_event_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  feed_kind text NOT NULL DEFAULT 'for_you',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, feed_kind)
);

-- Service role only; clients never touch this directly.
GRANT ALL ON public.session_feed_state TO service_role;

ALTER TABLE public.session_feed_state ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → effectively locked to service_role.
-- (RLS enabled with zero policies = deny-all for non-bypass roles.)

CREATE INDEX idx_session_feed_state_updated_at
  ON public.session_feed_state (updated_at);

CREATE INDEX idx_session_feed_state_user
  ON public.session_feed_state (user_id) WHERE user_id IS NOT NULL;

-- Cleanup function: drop sessions older than 24h.
CREATE OR REPLACE FUNCTION public.cleanup_session_feed_state()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.session_feed_state
  WHERE updated_at < now() - interval '24 hours';
$$;

-- Schedule nightly cleanup at 03:00 UTC.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-session-feed-state')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'cleanup-session-feed-state'
    );
    PERFORM cron.schedule(
      'cleanup-session-feed-state',
      '0 3 * * *',
      $cron$ SELECT public.cleanup_session_feed_state(); $cron$
    );
  END IF;
END $$;
