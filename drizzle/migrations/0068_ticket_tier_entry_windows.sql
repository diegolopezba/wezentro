ALTER TABLE public.ticket_tiers ADD COLUMN IF NOT EXISTS scan_from timestamptz, ADD COLUMN IF NOT EXISTS scan_until timestamptz;

CREATE OR REPLACE FUNCTION public.apply_tier_scan_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from timestamptz; v_until timestamptz;
BEGIN
  IF NEW.ticket_tier_id IS NULL OR NEW.scan_from IS NOT NULL OR NEW.scan_until IS NOT NULL OR COALESCE(NEW.is_special_guest,false) THEN
    RETURN NEW;
  END IF;
  SELECT scan_from, scan_until INTO v_from, v_until FROM public.ticket_tiers WHERE id = NEW.ticket_tier_id;
  NEW.scan_from := v_from; NEW.scan_until := v_until;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_tier_scan_window ON public.guestlist_entries;
CREATE TRIGGER trg_apply_tier_scan_window BEFORE INSERT ON public.guestlist_entries FOR EACH ROW EXECUTE FUNCTION public.apply_tier_scan_window();

CREATE OR REPLACE FUNCTION public.sync_tier_scan_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.scan_from IS DISTINCT FROM OLD.scan_from OR NEW.scan_until IS DISTINCT FROM OLD.scan_until THEN
    UPDATE public.guestlist_entries SET scan_from = NEW.scan_from, scan_until = NEW.scan_until
     WHERE ticket_tier_id = NEW.id AND NOT COALESCE(is_special_guest,false) AND checked_in_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_tier_scan_window ON public.ticket_tiers;
CREATE TRIGGER trg_sync_tier_scan_window AFTER UPDATE ON public.ticket_tiers FOR EACH ROW EXECUTE FUNCTION public.sync_tier_scan_window();