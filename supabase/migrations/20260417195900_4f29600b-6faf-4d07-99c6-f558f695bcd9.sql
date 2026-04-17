-- 2. Lock down user_category_preferences
DROP POLICY IF EXISTS "Anyone can view category preferences for collaborative filtering"
  ON public.user_category_preferences;

-- 3. Restrict saved_events SELECT
DROP POLICY IF EXISTS "Anyone can view save counts" ON public.saved_events;

CREATE POLICY "Users can view own saved events"
  ON public.saved_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Event creators can view saves on own events"
  ON public.saved_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = saved_events.event_id
    AND events.creator_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.get_save_count(_event_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.saved_events WHERE event_id = _event_id
$$;

GRANT EXECUTE ON FUNCTION public.get_save_count(uuid) TO anon, authenticated;

-- 4. Profile visit deduplication
ALTER TABLE public.profile_visits
  ADD COLUMN IF NOT EXISTS visit_date date
  GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED;

-- Remove existing duplicates, keeping the earliest record per (profile, visitor, day)
DELETE FROM public.profile_visits pv
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY profile_id, visitor_id, visit_date
           ORDER BY created_at ASC
         ) AS rn
  FROM public.profile_visits
  WHERE visitor_id IS NOT NULL
) dups
WHERE pv.id = dups.id AND dups.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_visits_unique_daily
  ON public.profile_visits(profile_id, visitor_id, visit_date)
  WHERE visitor_id IS NOT NULL;

-- 5. Storage upload restrictions
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload event images" ON storage.objects;

CREATE POLICY "Authenticated users can upload event images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','webp','gif'])
  );

-- 6. Referrals defense-in-depth INSERT policy
CREATE POLICY "Users can create referrals for themselves"
  ON public.referrals FOR INSERT
  WITH CHECK (
    auth.uid() = referred_user_id
    AND referrer_id != referred_user_id
  );