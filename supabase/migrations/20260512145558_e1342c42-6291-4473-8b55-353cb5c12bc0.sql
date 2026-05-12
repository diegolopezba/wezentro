-- 1. Make guestlist_invitations cascade when either user is removed
ALTER TABLE public.guestlist_invitations
  DROP CONSTRAINT IF EXISTS guestlist_invitations_inviter_id_fkey,
  DROP CONSTRAINT IF EXISTS guestlist_invitations_invited_user_id_fkey;

ALTER TABLE public.guestlist_invitations
  ADD CONSTRAINT guestlist_invitations_inviter_id_fkey
    FOREIGN KEY (inviter_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT guestlist_invitations_invited_user_id_fkey
    FOREIGN KEY (invited_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Auto-delete chats that have no participants left
CREATE OR REPLACE FUNCTION public.cleanup_empty_chats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants WHERE chat_id = OLD.chat_id
  ) THEN
    DELETE FROM public.chats WHERE id = OLD.chat_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_empty_chats ON public.chat_participants;
CREATE TRIGGER trg_cleanup_empty_chats
AFTER DELETE ON public.chat_participants
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_empty_chats();