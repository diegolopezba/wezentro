
-- Update increment_sponsored_impressions to track spending and auto-pause
CREATE OR REPLACE FUNCTION public.increment_sponsored_impressions(_post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total_budget numeric;
  _new_spent numeric;
BEGIN
  -- Increment impressions and spending ($5 CPM = $0.005 per impression)
  UPDATE sponsored_posts
  SET 
    impressions = impressions + 1,
    spent = spent + 0.005
  WHERE id = _post_id AND status = 'active'
  RETURNING total_budget, spent INTO _total_budget, _new_spent;

  -- Auto-pause if total budget is exhausted
  IF _total_budget IS NOT NULL AND _new_spent >= _total_budget THEN
    UPDATE sponsored_posts
    SET status = 'paused'
    WHERE id = _post_id;
  END IF;
END;
$function$;

-- Add ad_payment_session_id column to track Stripe session for activation
ALTER TABLE public.sponsored_posts 
ADD COLUMN IF NOT EXISTS ad_payment_session_id text;
