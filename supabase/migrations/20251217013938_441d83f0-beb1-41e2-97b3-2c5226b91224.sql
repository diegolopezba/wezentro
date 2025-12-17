-- Function to get mutual followers (users who follow each other)
CREATE OR REPLACE FUNCTION public.get_mutual_followers(_user_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM follows f1 
    WHERE f1.follower_id = _user_id AND f1.following_id = p.id
  )
  AND EXISTS (
    SELECT 1 FROM follows f2 
    WHERE f2.follower_id = p.id AND f2.following_id = _user_id
  )
$$;

-- Function to get or create a private chat between two users
CREATE OR REPLACE FUNCTION public.get_or_create_private_chat(_user_id uuid, _other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chat_id uuid;
BEGIN
  -- Check if a private chat already exists between these two users
  SELECT c.id INTO _chat_id
  FROM chats c
  WHERE c.type = 'private'
    AND c.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM chat_participants cp1 
      WHERE cp1.chat_id = c.id AND cp1.user_id = _user_id
    )
    AND EXISTS (
      SELECT 1 FROM chat_participants cp2 
      WHERE cp2.chat_id = c.id AND cp2.user_id = _other_user_id
    )
    AND (SELECT COUNT(*) FROM chat_participants WHERE chat_id = c.id) = 2
  LIMIT 1;

  -- If chat exists, return it
  IF _chat_id IS NOT NULL THEN
    RETURN _chat_id;
  END IF;

  -- Create new private chat
  INSERT INTO chats (type) VALUES ('private') RETURNING id INTO _chat_id;

  -- Add both participants
  INSERT INTO chat_participants (chat_id, user_id) VALUES (_chat_id, _user_id);
  INSERT INTO chat_participants (chat_id, user_id) VALUES (_chat_id, _other_user_id);

  RETURN _chat_id;
END;
$$;

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;