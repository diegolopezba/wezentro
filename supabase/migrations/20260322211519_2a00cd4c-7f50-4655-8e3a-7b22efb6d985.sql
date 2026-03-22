
-- Create event_comments table
CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT event_comments_content_length CHECK (char_length(content) BETWEEN 1 AND 500)
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.event_comments FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can comment"
  ON public.event_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or creator can soft delete comment"
  ON public.event_comments FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_comments.event_id AND creator_id = auth.uid()
    )
  );

-- Update notifications_type_check constraint to include 'comment'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'follow', 'guestlist_request', 'guestlist_approved', 'guestlist_rejected',
    'guestlist_invitation', 'repost', 'collaboration_request', 'collaboration_accepted',
    'referral_signup', 'new_reservation', 'reservation_cancelled', 'reservation_tagged',
    'post_tag', 'like', 'comment'
  ]));

-- Trigger function: notify event creator on new comment
CREATE OR REPLACE FUNCTION public.handle_new_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  commenter_username TEXT;
  event_creator_id UUID;
  event_title TEXT;
BEGIN
  SELECT username INTO commenter_username FROM profiles WHERE id = NEW.user_id;
  SELECT creator_id, title INTO event_creator_id, event_title
    FROM events WHERE id = NEW.event_id;

  IF event_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    event_creator_id,
    'comment',
    'Nuevo comentario',
    '@' || commenter_username || ' comentó en ' || COALESCE(event_title, 'tu publicación'),
    'event',
    NEW.event_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.event_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();
