CREATE TABLE IF NOT EXISTS public.web_vitals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  metric_name text NOT NULL,
  metric_value double precision NOT NULL,
  metric_rating text NULL,
  navigation_type text NULL,
  path text NULL,
  user_agent text NULL,
  is_native boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_created ON public.web_vitals (metric_name, created_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert performance metrics; nobody can read except via service role.
CREATE POLICY "anyone can insert web vitals"
  ON public.web_vitals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);