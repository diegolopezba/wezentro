
-- Add parent_id to event_comments for replies
ALTER TABLE public.event_comments ADD COLUMN parent_id uuid REFERENCES public.event_comments(id) ON DELETE CASCADE DEFAULT NULL;

-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.event_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);
