-- Fix handle_new_follow function to use correct entity_type ('user' instead of 'profile')
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_username TEXT;
BEGIN
  -- Get the follower's username
  SELECT username INTO follower_username
  FROM public.profiles
  WHERE id = NEW.follower_id;

  -- Create notification for the user being followed
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    entity_type,
    entity_id
  ) VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    '@' || follower_username || ' started following you',
    'user',
    NEW.follower_id
  );

  RETURN NEW;
END;
$$;