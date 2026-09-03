CREATE TABLE IF NOT EXISTS public.event_stats_daily (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, day)
);

GRANT SELECT ON public.event_stats_daily TO authenticated;
GRANT ALL ON public.event_stats_daily TO service_role;

ALTER TABLE public.event_stats_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event creators can read their daily stats"
  ON public.event_stats_daily FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_stats_daily.event_id AND e.creator_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_event_stats_daily_day ON public.event_stats_daily (day DESC);

CREATE OR REPLACE FUNCTION public.bump_event_stats(_event_id uuid, _impressions integer DEFAULT 0, _views integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.event_stats (event_id, view_count, impression_count, updated_at)
  VALUES (_event_id, GREATEST(_views, 0), GREATEST(_impressions, 0), now())
  ON CONFLICT (event_id) DO UPDATE SET
    view_count = public.event_stats.view_count + EXCLUDED.view_count,
    impression_count = public.event_stats.impression_count + EXCLUDED.impression_count,
    updated_at = now();

  INSERT INTO public.event_stats_daily (event_id, day, impressions, views)
  VALUES (_event_id, CURRENT_DATE, GREATEST(_impressions, 0), GREATEST(_views, 0))
  ON CONFLICT (event_id, day) DO UPDATE SET
    impressions = public.event_stats_daily.impressions + EXCLUDED.impressions,
    views = public.event_stats_daily.views + EXCLUDED.views;
EXCEPTION WHEN foreign_key_violation THEN
  RETURN;
END;
$function$;