

## Plan: Comment Likes & Replies (Instagram/TikTok style)

### Overview
Add two features to the comments system: (1) liking comments with a heart icon and like count, and (2) threaded replies with a "Responder" button that nests replies under parent comments.

### Database Changes

**New table: `comment_likes`**
```sql
CREATE TABLE public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.event_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);
```

**Alter `event_comments` — add `parent_id` for replies**
```sql
ALTER TABLE public.event_comments ADD COLUMN parent_id uuid REFERENCES public.event_comments(id) ON DELETE CASCADE DEFAULT NULL;
```

### Hook Changes — `src/hooks/useEventComments.ts`

1. Update `EventComment` interface: add `parent_id`, `like_count`, `is_liked`, and `replies` array.
2. Update `useEventComments` query: fetch only top-level comments (`parent_id IS NULL`), include like counts via a separate query or client-side join.
3. Add `useCommentReplies(commentId)` — fetches replies for a given parent comment.
4. Add `useCommentLikes` hooks:
   - `useLikeComment()` — insert into `comment_likes`
   - `useUnlikeComment()` — delete from `comment_likes`
   - `useCommentLikeStatus(commentIds)` — batch check if current user liked each comment
5. Update `useAddComment` to accept optional `parentId` parameter.
6. Update comment count queries to still count all comments (including replies).

### UI Changes — `src/components/events/CommentsSheet.tsx`

1. **Like button**: Add a small Heart icon + like count below each comment's content (right-aligned or inline like Instagram). Tap toggles like/unlike with optimistic update. Auth-gate the action.

2. **Reply button**: Add a "Responder" text button below each top-level comment. Tapping it:
   - Sets a `replyingTo` state with the parent comment ID and username
   - Shows "@username" prefix hint in the input bar
   - Submits with `parentId` set

3. **Replies rendering**: Under each top-level comment, show a "Ver N respuestas" toggle that expands/collapses replies (fetched via `useCommentReplies`). Replies are indented with smaller avatars, same like/delete functionality.

4. **Reply indicator in input**: When replying, show a small dismiss chip above the input showing "Respondiendo a @username" with an X to cancel.

### Files Affected

| File | Action |
|---|---|
| Migration SQL | Create `comment_likes` table, add `parent_id` to `event_comments` |
| `src/hooks/useEventComments.ts` | Add reply/like hooks, update interfaces and queries |
| `src/components/events/CommentsSheet.tsx` | Add like buttons, reply UI, threaded reply rendering |

### UX Details
- Like: small heart icon right of comment text, turns red/filled when liked, shows count if > 0
- Reply: "Responder" link below comment content, indented replies with "Ver N respuestas" collapsible
- Replies are 1-level deep only (no nested reply chains) — replying to a reply targets the same parent
- Comment count in header still reflects total (comments + replies)

