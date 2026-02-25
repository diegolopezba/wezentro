-- Phase 1: Composite indexes for high-traffic queries

-- Events feed indexes
CREATE INDEX IF NOT EXISTS idx_events_feed ON public.events (is_public, deleted_at, created_at DESC) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_creator ON public.events (creator_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON public.events (start_datetime) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category) WHERE is_public = true AND deleted_at IS NULL;

-- Event interactions indexes
CREATE INDEX IF NOT EXISTS idx_event_interactions_trending ON public.event_interactions (created_at, event_id);
CREATE INDEX IF NOT EXISTS idx_event_interactions_collab ON public.event_interactions (user_id, type, created_at) WHERE user_id IS NOT NULL;

-- Guestlist indexes
CREATE INDEX IF NOT EXISTS idx_guestlist_event_status ON public.guestlist_entries (event_id, status);
CREATE INDEX IF NOT EXISTS idx_guestlist_user_status ON public.guestlist_entries (user_id, status);

-- Notifications index
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- Messages index
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages (chat_id, created_at DESC) WHERE deleted_at IS NULL;

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id);

-- Phase 3: Efficient chat list function with last message + unread count per chat
CREATE OR REPLACE FUNCTION public.get_chat_list_with_unread(_user_id uuid)
RETURNS TABLE (
  chat_id uuid,
  chat_type text,
  chat_name text,
  event_id uuid,
  chat_created_at timestamptz,
  last_message_content text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS chat_id,
    c.type AS chat_type,
    c.name AS chat_name,
    c.event_id,
    c.created_at AS chat_created_at,
    lm.content AS last_message_content,
    lm.created_at AS last_message_at,
    lm.sender_id AS last_message_sender_id,
    COALESCE(
      (
        SELECT COUNT(*)
        FROM messages m2
        WHERE m2.chat_id = c.id
          AND m2.deleted_at IS NULL
          AND m2.sender_id != _user_id
          AND (cp.last_read_at IS NULL OR m2.created_at > cp.last_read_at)
      ),
      0
    ) AS unread_count
  FROM chats c
  JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = _user_id
  LEFT JOIN LATERAL (
    SELECT content, created_at, sender_id
    FROM messages
    WHERE chat_id = c.id AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE c.deleted_at IS NULL
  ORDER BY COALESCE(lm.created_at, c.created_at) DESC
$$;