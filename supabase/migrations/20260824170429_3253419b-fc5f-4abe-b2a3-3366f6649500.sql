ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS waitlist_early_access_hours integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_capacity integer,
  ADD COLUMN IF NOT EXISTS waitlist_released_at timestamptz;

CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_waitlist_event_position_idx ON public.event_waitlist(event_id, position);
CREATE INDEX IF NOT EXISTS event_waitlist_user_idx ON public.event_waitlist(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_waitlist TO authenticated;
GRANT ALL ON public.event_waitlist TO service_role;

ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own waitlist entry"
  ON public.event_waitlist FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event owners can view their waitlist"
  ON public.event_waitlist FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_waitlist.event_id AND e.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_collaborators c
      WHERE c.event_id = event_waitlist.event_id
        AND c.user_id = auth.uid()
        AND c.status = 'accepted'
    )
  );

CREATE TRIGGER update_event_waitlist_updated_at
  BEFORE UPDATE ON public.event_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.join_event_waitlist(_event_id uuid)
RETURNS TABLE (wl_position integer, wl_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cap integer;
  _enabled boolean;
  _released timestamptz;
  _count integer;
  _pos integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT e.waitlist_enabled, e.waitlist_capacity, e.waitlist_released_at
    INTO _enabled, _cap, _released
  FROM public.events e WHERE e.id = _event_id FOR SHARE;

  IF NOT FOUND OR NOT _enabled THEN
    RAISE EXCEPTION 'Waitlist not available for this event';
  END IF;

  IF _released IS NOT NULL THEN
    RAISE EXCEPTION 'Tickets are already on sale';
  END IF;

  SELECT w.position INTO _pos FROM public.event_waitlist w
    WHERE w.event_id = _event_id AND w.user_id = _uid;
  IF _pos IS NOT NULL THEN
    SELECT count(*) INTO _count FROM public.event_waitlist w WHERE w.event_id = _event_id;
    RETURN QUERY SELECT _pos, _count;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_event_id::text));

  SELECT count(*) INTO _count FROM public.event_waitlist w WHERE w.event_id = _event_id;

  IF _cap IS NOT NULL AND _count >= _cap THEN
    RAISE EXCEPTION 'Waitlist is full';
  END IF;

  SELECT COALESCE(max(w.position), 0) + 1 INTO _pos
    FROM public.event_waitlist w WHERE w.event_id = _event_id;

  INSERT INTO public.event_waitlist (event_id, user_id, position)
  VALUES (_event_id, _uid, _pos);

  RETURN QUERY SELECT _pos, _count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_event_waitlist(uuid) TO authenticated;