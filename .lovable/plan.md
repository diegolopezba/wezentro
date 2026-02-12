

## Post Tagging Feature

This feature lets any user tag another account when creating a post/event. The tagged user gets a notification and can accept or decline whether the post appears on their profile timeline.

### How It Differs from Collaborations
- **Collaborations**: Both users are co-authors; the collaborator must accept before the post shows anywhere as a joint creation.
- **Tagging**: The post is published immediately by the creator. The tagged user simply chooses whether it also appears on their own profile timeline. The tag is visible on the post regardless of acceptance.

### User Flow

1. **Creating a post** -- User A sees a new "Tag Account" button (similar to the existing "Add Collaborator" button). Tapping it opens a picker to search and select a user to tag.
2. **Notification** -- User B receives a notification: "@userA te etiquetó en una publicación."
3. **Accept/Decline** -- From the notification (or the post itself), User B can accept (post appears on their timeline) or decline (it does not).
4. **Profile timeline** -- User B's profile shows both their own posts AND accepted tagged posts.
5. **Post detail** -- The tagged user is shown on the EventDetail page (e.g., a small avatar/chip below the creator info).

---

### Technical Plan

#### 1. New Database Table: `event_tags`

```sql
CREATE TABLE public.event_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, tagged_user_id)
);

-- RLS policies
ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can read tags (public posts)
CREATE POLICY "Anyone can read tags" ON public.event_tags
  FOR SELECT USING (true);

-- Creator of the event can insert tags
CREATE POLICY "Event creator can tag" ON public.event_tags
  FOR INSERT WITH CHECK (
    auth.uid() = tagged_by
    AND EXISTS (SELECT 1 FROM events WHERE id = event_id AND creator_id = auth.uid())
  );

-- Tagged user can update status (accept/decline)
CREATE POLICY "Tagged user can respond" ON public.event_tags
  FOR UPDATE USING (auth.uid() = tagged_user_id)
  WITH CHECK (auth.uid() = tagged_user_id);

-- Creator can remove tags
CREATE POLICY "Creator can remove tags" ON public.event_tags
  FOR DELETE USING (
    auth.uid() = tagged_by
    OR auth.uid() = tagged_user_id
  );
```

#### 2. Database Trigger for Notifications

A trigger on `event_tags` INSERT that creates a notification for the tagged user:

```sql
CREATE OR REPLACE FUNCTION public.handle_event_tag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  tagger_username TEXT;
  event_title TEXT;
BEGIN
  SELECT username INTO tagger_username FROM profiles WHERE id = NEW.tagged_by;
  SELECT title INTO event_title FROM events WHERE id = NEW.event_id;

  INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (
    NEW.tagged_user_id,
    'post_tag',
    'Te etiquetaron',
    '@' || tagger_username || ' te etiquetó en ' || COALESCE(event_title, 'una publicación'),
    'event',
    NEW.event_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_event_tag_created
  AFTER INSERT ON public.event_tags
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_tag();
```

#### 3. New Hook: `src/hooks/useEventTags.ts`

- `useEventTags(eventId)` -- fetch tags for a post
- `useTagUser()` -- mutation to tag a user on a post
- `useRespondToTag()` -- mutation to accept/decline a tag
- `useRemoveTag()` -- mutation to remove a tag
- `usePendingTags()` -- fetch pending tags for the current user (for notifications)

#### 4. Update Create Page (`src/pages/Create.tsx`)

- Add a "Tag Account" button alongside the existing "Collaborator" button
- Reuse the `CollaboratorPickerModal` pattern (or a new `TagPickerModal`) to search users
- After event creation, insert into `event_tags` table
- Allow tagging any user (not restricted to mutual followers)

#### 5. Update User Timeline (`src/hooks/useUserTimeline.ts`)

Modify the query to also return posts where the user has been tagged AND accepted:

```typescript
// Fetch user's own posts + accepted tagged posts
const [ownPosts, taggedPosts] = await Promise.all([
  supabase.from("events").select("*, creator:profiles!..., guestlist_entries(count)")
    .eq("creator_id", userId).is("deleted_at", null),
  supabase.from("event_tags").select("event:events(*, creator:profiles!..., guestlist_entries(count))")
    .eq("tagged_user_id", userId).eq("status", "accepted")
]);
// Merge, deduplicate, sort by created_at desc
```

#### 6. Update Notifications Page (`src/pages/Notifications.tsx`)

- Add a new `PostTagNotificationItem` component (similar to `CollaborationNotificationItem`)
- Shows the tagger's avatar, post image, and accept/decline buttons
- Accepting adds the post to User B's timeline; declining hides the buttons

#### 7. Update EventDetail Page (`src/pages/EventDetail.tsx`)

- Show tagged users as small avatar chips below the creator info
- If the current user is the creator, allow removing tags
- If the current user is the tagged user with a pending tag, show accept/decline inline

#### 8. Notification Type Registration

Add `'post_tag'` to the notification type handling in:
- `src/hooks/useNotifications.ts` (if type filtering exists)
- `src/pages/Notifications.tsx` (switch statement in `renderNotification`)
- Icon mapping: use a `Tag` or `AtSign` icon from lucide-react

