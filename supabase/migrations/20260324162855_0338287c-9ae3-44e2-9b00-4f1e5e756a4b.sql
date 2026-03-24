ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reservation_start_time TIME DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS reservation_end_time TIME DEFAULT '22:00';