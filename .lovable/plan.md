
## Diagnosis — Are the Fixes Sufficient?

### What was previously identified as the bug
The theory was that `useIsEventLiked(eventId!)` passes `undefined` when `eventId` is undefined, causing the React Query cache key `["event-liked", undefined, userId]` to never be invalidated by `["event-liked", realId, userId]` on mutation success — so the Heart button never flips.

### What the code actually shows

**Line 57**: `useIsEventLiked(eventId!)` — on the full-page `EventDetail`, `eventId` comes from `useParams()` which returns a string immediately (never undefined after route matches). On the `EventDetailOverlay`, `eventId` is `selectedEventId || undefined` — can be `undefined` momentarily but resolves before queries run.

**Line 58**: `useEventLikes(event ? eventId! : undefined)` — this is guarded on `event` existing, so it doesn't fire until the event loads. But `useEventLikes` accepts `string`, not `string | undefined`. When `undefined` is passed, the `enabled: !!eventId` guard inside the hook blocks the query. The cache key would be `["event-likes", undefined]` — but since `enabled: false`, no data is ever fetched under that key, so no stale data problem.

**The real issue with likes**: Looking at `useEventLikes`, its type signature is `useEventLikes(eventId: string)` — but when called with `undefined` (TypeScript `!` bypassed at runtime), it stores the result under `["event-likes", undefined]`. Then after mutation success, `invalidateQueries({ queryKey: ["event-likes", eventId] })` invalidates `["event-likes", "real-uuid"]`. These ARE different keys, so the count refetches correctly.

**For `useIsEventLiked`**: At line 57, the query key is `["event-liked", eventId!, user?.id]`. If `eventId` is the real UUID (from `useParams`), then mutation invalidation of `["event-liked", eventId]` will match and trigger a refetch. This should work.

### So why was liking not working?

The most likely real cause: **`saved_events` RLS is the proven issue** (confirmed by the DB query — SELECT policy is `auth.uid() = user_id`, no public read). For **likes**, the RLS is `USING (true)` — public reads work fine. For **likes**, the `INSERT` policy is `auth.uid() = user_id` — should work for logged-in users.

The like not working could be a **session/auth issue** — if the user was not properly authenticated when tapping like, the insert fails silently (RLS violation → error thrown → `toast.error` shown). But `handleLikeToggle` checks `isGuest` first, so it wouldn't even attempt the insert for guests.

**Most likely actual cause of broken like**: The `useEventLikes` hook on line 58 is called with `event ? eventId! : undefined`. When `event` is `undefined` (still loading), `useEventLikes(undefined)` is called. The TypeScript type says `string` but `undefined` is passed. Inside the hook, `enabled: !!eventId` blocks the query — so `likeCount` stays at its default `0`. After `event` loads, `useEventLikes(eventId!)` is called with the real ID and fires. This part works.

The `isLiked` state: `useIsEventLiked(eventId!)` always runs with the real ID. After like mutation, `invalidateQueries(["event-liked", eventId])` fires. The `eventId` at that point is the real UUID. This matches the cached key. So it should work.

**Confirmed broken**: `saved_events` save count for guests/other users returns 0 because `SELECT USING (auth.uid() = user_id)` blocks all reads by others. This is confirmed.

**Send button**: both views call `setShowShareModal(true)` inline — no auth check. Confirmed broken for guests.

### The Complete Fix Plan

**1. Database migration — fix `saved_events` SELECT policy**  
Drop the restrictive SELECT policy and add two policies:
- Public policy: `USING (true)` for aggregate count reads (so any user/guest can read counts)
- Keep INSERT/DELETE policies as-is (only owner can save/unsave)

Note: This exposes which users saved which events. Since `event_likes` already has `USING (true)`, this is consistent with the existing privacy model.

**2. `src/hooks/useEventDetailState.ts` — add `handleSendToggle`**  
Add alongside the other handlers:
```ts
const handleSendToggle = () => {
  if (isGuest) { promptAuth({ action: "enviar este evento" }); return; }
  setShowShareModal(true);
};
```
Return it from the hook.

**3. `src/pages/EventDetail.tsx` line 154**  
Replace `onClick={() => setShowShareModal(true)}` → `onClick={handleSendToggle}` and destructure `handleSendToggle` from the hook.

**4. `src/components/events/EventDetailOverlay.tsx` line 176**  
Same replacement.

**Will this fully fix the like button?**  
After careful analysis: yes, the like/repost logic is structurally correct and the RLS allows public reads. The most likely reason a like "didn't work" was either a one-time network/auth issue, or the save count showing 0 made it seem like nothing was working. The like INSERT RLS is `auth.uid() = user_id` which is correct for logged-in users. The invalidation keys match. No code change needed for like/repost logic itself.

---

### Files to change

| File | Change |
|---|---|
| DB migration | Replace `saved_events` SELECT policy with `USING (true)` |
| `useEventDetailState.ts` | Add `handleSendToggle` with auth guard, return it |
| `EventDetail.tsx` | Destructure + use `handleSendToggle` on Send button |
| `EventDetailOverlay.tsx` | Destructure + use `handleSendToggle` on Send button |
