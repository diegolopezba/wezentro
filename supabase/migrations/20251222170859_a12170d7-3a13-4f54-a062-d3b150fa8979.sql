-- Create function to auto-join guestlist when invitation is accepted
CREATE OR REPLACE FUNCTION public.auto_join_guestlist_on_invitation_accept()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Insert guestlist entry as approved (since they were invited)
    INSERT INTO public.guestlist_entries (event_id, user_id, status)
    VALUES (NEW.event_id, NEW.invited_user_id, 'approved')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on guestlist_invitations
CREATE TRIGGER on_invitation_accepted_join_guestlist
  AFTER UPDATE ON public.guestlist_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_join_guestlist_on_invitation_accept();