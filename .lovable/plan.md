

## "People Going" Section with Following Priority

### Concept

Instead of hiding the section when no followed users are attending, always show who's going to the event. Followed users appear first (ranked by interaction score), then remaining attendees fill out the row. This maintains FOMO regardless of whether the user follows anyone attending.

### New Hook: `useFollowingGoing.ts`

Queries `guestlist_entries` (status = 'approved') joined with `profiles` for the event. For authenticated users, also fetches:
- Their following list from `follows`
- Interaction scores from `user_creator_preferences`

Returns two things:
- `followingGoing`: followed attendees sorted by interaction score
- `othersGoing`: remaining attendees

The UI combines them: following first, then others, to fill the avatar row.

### UI Section

Placed **above** the existing "Lista de invitados" guestlist section in both `EventDetail.tsx` and `EventDetailOverlay.tsx`:

```text
┌──────────────────────────────────────┐
│ 👥 Personas que van (12)             │
│ [avatar][avatar][avatar][avatar] +8  │
│ @ana, @luis y 10 más van             │
└──────────────────────────────────────┘
```

- If some are followed: header says "Personas que sigues que van (N)" showing followed count, with remaining attendees filling the avatar row after them
- If none are followed (or user is guest): header says "Personas que van (N)" showing total count, avatars from all attendees
- Avatars are clickable (navigate to profile)
- Always visible as long as at least 1 person is going

### Changes

| File | Change |
|---|---|
| `src/hooks/useFollowingGoing.ts` | New hook — queries approved guestlist entries, identifies followed users, sorts by creator preference score, returns both groups |
| `src/hooks/useEventDetailState.ts` | Import and expose the hook's data |
| `src/pages/EventDetail.tsx` | Add "Personas que van" section above guestlist |
| `src/components/events/EventDetailOverlay.tsx` | Same section |

### Hook logic

```ts
// Single query for all approved attendees
const { data: attendees } = supabase
  .from("guestlist_entries")
  .select("user_id, user:profiles!...(id, username, avatar_url)")
  .eq("event_id", eventId)
  .eq("status", "approved");

// If authenticated, fetch following IDs + preference scores
// Partition attendees into followingGoing (sorted by score) + othersGoing
// Return combined list: [...followingGoing, ...othersGoing]
```

The section renders the combined list with up to 5 avatars stacked, a "+N más" counter, and a text line showing usernames. Followed users get a subtle ring/indicator to distinguish them.

