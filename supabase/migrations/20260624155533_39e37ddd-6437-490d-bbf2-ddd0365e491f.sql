-- Append-only interaction log. One row per user interaction. Workers
-- aggregate it asynchronously into preference tables.
CREATE TABLE IF NOT EXISTS public.interaction_events_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  signal_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interaction_events_log_created_at_idx
  ON public.interaction_events_log (created_at);

GRANT SELECT, INSERT ON public.interaction_events_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.interaction_events_log_id_seq TO authenticated;
GRANT ALL ON public.interaction_events_log TO service_role;
GRANT ALL ON SEQUENCE public.interaction_events_log_id_seq TO service_role;

ALTER TABLE public.interaction_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own interaction log rows"
  ON public.interaction_events_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cannot read the log directly"
  ON public.interaction_events_log
  FOR SELECT
  TO authenticated
  USING (false);

-- Single-call RPC the client uses instead of 3–5 sync round-trips.
-- Allowed signal types are validated here so the worker only sees clean input.
CREATE OR REPLACE FUNCTION public.log_interaction(
  _event_id UUID,
  _signal_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
BEGIN
  IF _user IS NULL THEN
    RETURN;
  END IF;

  IF _signal_type NOT IN ('join', 'save', 'like', 'repost', 'click', 'not_interested') THEN
    RETURN;
  END IF;

  INSERT INTO public.interaction_events_log (user_id, event_id, signal_type)
  VALUES (_user, _event_id, _signal_type);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_interaction(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_interaction(UUID, TEXT) TO authenticated, service_role;

-- Cursor table so the worker knows where it left off.
CREATE TABLE IF NOT EXISTS public.worker_cursors (
  name TEXT PRIMARY KEY,
  last_processed_id BIGINT NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.worker_cursors TO service_role;
ALTER TABLE public.worker_cursors ENABLE ROW LEVEL SECURITY;

-- TTL cleanup: 90 days
CREATE OR REPLACE FUNCTION public.cleanup_interaction_events_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.interaction_events_log WHERE created_at < now() - interval '90 days';
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_interaction_events_log() TO service_role;