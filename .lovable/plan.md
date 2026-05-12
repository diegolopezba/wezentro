## Goal

- **Feed (EventCard):** show up to **3 attendee avatars** (no owner avatar). Prioritize attendees the viewer follows, ordered by interaction score desc; fill remaining slots with other attendees.
- **Event details page:** keep up to **5 avatars**, with the same prioritization (followed-by-score first, then others). The existing `useFollowingGoing` hook already does this, just confirm and reuse.

## Changes

### 1. New shared hook: `src/hooks/useViewerFollowGraph.ts`

Single cached query for the logged-in viewer:
- `followingIds: Set<string>` — from `follows` where `follower_id = viewer`.
- `scoreMap: Record<string, number>` — from `user_creator_preferences` where `user_id = viewer`.

Long `staleTime` (e.g. 5 min). Returns empty data for guests (no avatar prioritization, fallback to current order).

### 2. EventCard (`src/components/events/EventCard.tsx`)

- Remove `ownerAvatar` from props/render and from the `memo` comparator.
- Use `useViewerFollowGraph()` to sort `attendeeAvatars`:
  1. Followed attendees, sorted by `scoreMap[id]` desc
  2. Then non-followed attendees (preserving incoming order)
- Slice to **3** total. Placeholder default avatars fill remaining slots only if `attendees > sortedList.length`.
- Numeric attendee count stays as-is.

### 3. Index feed (`src/pages/Index.tsx`)

- Stop passing `ownerAvatar` to `EventCard` (both regular events and sponsored).
- `attendeeAvatars` already includes all approved guestlist users — no fetch change needed.

### 4. Event details page

- `useFollowingGoing` already returns attendees sorted (followed-by-score first, then others). Confirm the details page renders `slice(0, 5)` and "+N más" — leave the cap at **5**.
- No backend or hook change needed there.

### 5. Out of scope (intentionally untouched)

- `TimelineCard` (profile timeline) keeps its current owner avatar — it's a different surface, user only mentioned feed + details.
- `RelatedEventsFeed` / `JoinedEvents` still pass `ownerAvatar` but `EventCard` will simply ignore it after the prop is removed (safe — TS may warn, will clean up the prop usage in those two files too).

## Technical notes

- `user_creator_preferences` lookup is filtered by `creator_id IN (...)` only for attendees actually present, but for the feed we fetch all viewer scores once (small per-user table) — simpler and avoids per-card queries.
- For guests / users with no follows, sort is a no-op and the feed renders the first 3 attendees as today.
- Memo comparator on EventCard updated: drop `ownerAvatar`, add a hash of the first 3 attendee IDs so re-sorts trigger re-render.
