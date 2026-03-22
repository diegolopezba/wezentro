
## Root Cause

The `event_comments` table has no foreign key from `user_id` to `profiles`. The Supabase query in `useEventComments` uses `user:profiles!user_id(...)` which requires an FK to resolve the join — without it the query returns an empty result (or the join silently fails), while the separate count query (`select id, count: exact`) works fine since it has no join. That's why comment count shows but comments don't render.

### Fix (2 parts)

**1. Database migration** — Add the missing FK:
```sql
ALTER TABLE public.event_comments
  ADD CONSTRAINT event_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

Wait — Supabase PostgREST resolves `profiles!user_id` by looking for an FK from `event_comments.user_id` to `profiles.id`. Since `profiles.id` references `auth.users.id`, we need the FK to point at `profiles`, not `auth.users`:
```sql
ALTER TABLE public.event_comments
  ADD CONSTRAINT event_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

This is a pure SQL migration — no code changes needed. The query in `useEventComments.ts` is already written correctly; it just needs the FK to exist.

**2. Verify / update `types.ts`** — After the migration the auto-generated types will reflect the new FK. Since we can't edit `types.ts` directly, the migration alone is sufficient.

### Files Changed
| File | Change |
|---|---|
| New migration | Add `event_comments_user_id_fkey` FK from `event_comments.user_id → profiles.id` |

No frontend code changes required. The query, RLS, sheet and teaser are all correct — the FK was just never created.
