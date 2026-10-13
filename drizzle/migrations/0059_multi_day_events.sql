ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_days jsonb;
COMMENT ON COLUMN public.events.event_days IS 'Multi-day events: ordered array of {start,end} ISO timestamps, one per day. NULL for single-day events.';
ALTER TABLE public.ticket_tiers ADD COLUMN IF NOT EXISTS valid_day smallint;
COMMENT ON COLUMN public.ticket_tiers.valid_day IS '1-based day this tier is valid for in multi-day events. NULL = all days (full pass).';
ALTER TABLE public.guestlist_entries ADD COLUMN IF NOT EXISTS event_day smallint;
ALTER TABLE public.guestlist_entries ADD COLUMN IF NOT EXISTS parent_entry_id uuid REFERENCES public.guestlist_entries(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS guestlist_entries_parent_idx ON public.guestlist_entries(parent_entry_id) WHERE parent_entry_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_entry_event_day()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days jsonb; v_valid smallint;
BEGIN
  IF NEW.event_day IS NOT NULL OR NEW.parent_entry_id IS NOT NULL OR NEW.ticket_tier_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT event_days INTO v_days FROM public.events WHERE id = NEW.event_id;
  IF v_days IS NULL OR jsonb_typeof(v_days) <> 'array' OR jsonb_array_length(v_days) < 2 THEN
    RETURN NEW;
  END IF;
  SELECT valid_day INTO v_valid FROM public.ticket_tiers WHERE id = NEW.ticket_tier_id;
  NEW.event_day := COALESCE(v_valid, 1);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.issue_multi_day_pass_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days jsonb; v_valid smallint; v_n int; i int;
BEGIN
  IF NEW.parent_entry_id IS NOT NULL OR NEW.ticket_tier_id IS NULL OR NEW.event_day IS DISTINCT FROM 1 THEN
    RETURN NEW;
  END IF;
  SELECT valid_day INTO v_valid FROM public.ticket_tiers WHERE id = NEW.ticket_tier_id;
  IF v_valid IS NOT NULL THEN RETURN NEW; END IF;
  SELECT event_days INTO v_days FROM public.events WHERE id = NEW.event_id;
  v_n := COALESCE(jsonb_array_length(v_days), 0);
  FOR i IN 2..v_n LOOP
    INSERT INTO public.guestlist_entries (
      event_id, user_id, purchased_by_user_id, status, payment_status, payment_confirmed_at,
      ticket_tier_id, promoter_id, is_special_guest, special_guest_label, guest_name, guest_email,
      payment_session_id, area_booking_id, event_day, parent_entry_id
    ) VALUES (
      NEW.event_id, NULL, COALESCE(NEW.purchased_by_user_id, NEW.user_id), NEW.status, NEW.payment_status, NEW.payment_confirmed_at,
      NEW.ticket_tier_id, NEW.promoter_id, NEW.is_special_guest, NEW.special_guest_label,
      COALESCE(NEW.guest_name, (SELECT full_name FROM public.profiles WHERE id = NEW.user_id)), NEW.guest_email,
      NEW.payment_session_id, NEW.area_booking_id, i, NEW.id
    );
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_multi_day_pass_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_entry_id IS NULL AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.payment_status IS DISTINCT FROM OLD.payment_status) THEN
    UPDATE public.guestlist_entries
       SET status = NEW.status, payment_status = NEW.payment_status, payment_confirmed_at = NEW.payment_confirmed_at
     WHERE parent_entry_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_entry_event_day ON public.guestlist_entries;
CREATE TRIGGER trg_assign_entry_event_day BEFORE INSERT ON public.guestlist_entries FOR EACH ROW EXECUTE FUNCTION public.assign_entry_event_day();
DROP TRIGGER IF EXISTS trg_issue_multi_day_pass ON public.guestlist_entries;
CREATE TRIGGER trg_issue_multi_day_pass AFTER INSERT ON public.guestlist_entries FOR EACH ROW EXECUTE FUNCTION public.issue_multi_day_pass_entries();
DROP TRIGGER IF EXISTS trg_sync_multi_day_pass ON public.guestlist_entries;
CREATE TRIGGER trg_sync_multi_day_pass AFTER UPDATE ON public.guestlist_entries FOR EACH ROW EXECUTE FUNCTION public.sync_multi_day_pass_entries();