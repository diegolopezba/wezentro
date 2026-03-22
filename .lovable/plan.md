
## Add Comments — Instagram/TikTok Style

### How it works
- In the action bar: a `MessageCircle` button shows the total comment count. Tapping it opens the comments bottom sheet.
- Below the description (inline): a single "most recent" comment preview is shown — avatar + username + truncated text. Tapping it also opens the sheet.
- The comments bottom sheet (`CommentsSheet`) slides up from the bottom, showing the full thread with an input at the bottom.

---

### 1. Database migration

New `event_comments` table:
```sql
CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
-- SELECT: everyone can read non-deleted comments
CREATE POLICY "Anyone can view comments" ON public.event_comments FOR SELECT USING (deleted_at IS NULL);
-- INSERT: authenticated users only
CREATE POLICY "Authenticated users can comment" ON public.event_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE (soft delete): comment owner or event creator
CREATE POLICY "Owner or creator can delete comment" ON public.event_comments FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND creator_id = auth.uid())
);
```

Update `notifications_type_check` to include `'comment'`.

Add DB trigger `handle_new_comment()` — notifies event creator on new comment (skips if commenter = creator).

---

### 2. New files

| File | Purpose |
|---|---|
| `src/hooks/useEventComments.ts` | `useEventComments(eventId)` — fetches comments with profile join; `useAddComment` mutation; `useDeleteComment` soft-delete mutation; `useCommentCount` |
| `src/components/events/CommentsSheet.tsx` | Bottom sheet with full comment thread + input bar. Handles auth gate for unauthenticated users. |

**CommentsSheet structure:**
```
<Sheet side="bottom"> 
  header: "Comentarios (N)"
  scrollable list: avatar + @username + text + timestamp + delete (owner/creator)
  sticky input: avatar + text field + send button
</Sheet>
```

---

### 3. Changes to existing files

| File | Change |
|---|---|
| `src/hooks/useEventDetailState.ts` | Add `showComments` / `setShowComments` state |
| `src/pages/EventDetail.tsx` | 1. Add `MessageCircle` button in action bar with comment count. 2. Add single comment preview below description. 3. Mount `<CommentsSheet>`. |
| `src/components/events/EventDetailOverlay.tsx` | Same 3 changes as above |
| `src/pages/Notifications.tsx` | Add `'comment'` notification render (avatar + body + navigate to event) |

---

### Comment preview (inline teaser)

Shown below the description section. Shows the **most recent** comment only:
```
[avatar] @username  "comment text truncated to 1 line..."
                     View all N comments  →
```
Tapping anywhere on it opens the sheet. If no comments yet, shows a subtle "Be the first to comment" tap target.

---

### Action bar placement

`MessageCircle` button sits alongside Like / Repost / Send / Save — shows count badge when > 0. Tapping opens the sheet (no scroll-to needed since it's a sheet, not inline).

---

### Technical notes
- Profile join: `event_comments` query joins `profiles(id, username, avatar_url)` via `user_id`
- Realtime not needed for v1 — `invalidateQueries` on submit is sufficient
- Soft delete: `UPDATE deleted_at = now()` — SELECT policy filters these out
- Sheet uses existing `Sheet` + `ScrollArea` primitives already in the project
