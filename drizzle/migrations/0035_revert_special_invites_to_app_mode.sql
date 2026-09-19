ALTER TABLE public.event_special_invites ALTER COLUMN delivery_mode SET DEFAULT 'app';
UPDATE public.event_special_invites
  SET delivery_mode = 'app'
  WHERE status = 'pending' AND delivery_mode = 'direct' AND rsvp_confirmed_at IS NULL;