
## @mention support in bios and event descriptions

### What exists today

- **Event tagging** already exists as a separate system (TagPickerModal, event_tags table) — users explicitly tag other accounts via a modal after creating an event.
- **Bio** is a plain text field rendered as `<p>` in UserProfile.tsx (line 221) — no @mention parsing.
- **Event descriptions** in EventDetailOverlay/TimelineCard/EventCard are rendered as plain text — no clickable @mentions.
- **`descriptionTagExtractor.ts`** only extracts semantic keyword tags for the recommendation engine; it doesn't parse @mentions.

### What needs to be built

**Phase 1 — Display: parse & render @mentions as clickable links**

Any text that contains `@username` should be rendered as a tappable link that navigates to that user's profile. This applies to:
1. Bio text on UserProfile page (line 221) and Profile page
2. Event description text on EventDetailOverlay
3. Event description text on TimelineCard/EventCard

We'll create a `MentionText` component:
- Splits text by `@word` regex pattern
- For each @mention token, renders a `<span>` styled like a link in `text-primary`
- On press, navigates to `/user/:username` or resolves username → user ID via a lightweight lookup query
- No extra DB queries needed at render time — we'll use username in the URL and the existing `useUserProfile` hook resolves it

**Phase 2 — Input: @mention autocomplete while typing**

In the bio textarea (EditProfile) and event description textarea (Create + EditEventSheet), as the user types `@` followed by characters, show an inline dropdown of matching users.

We'll create a `MentionTextarea` component:
- Extends the standard `<textarea>` behavior
- On every keystroke, detects if the cursor is inside a `@word` token (regex match behind cursor)
- When a `@xxx` pattern is detected with ≥1 character after `@`, fires a debounced search against `profiles` (ilike username)
- Shows a small floating dropdown of up to 5 results with avatar + username
- Selecting a result inserts `@username ` at the cursor position
- Pressing Escape or clicking outside dismisses the dropdown
- The final saved value is plain text (e.g. "Check out @johndoe at the party"), no special encoding needed

### Files to create/modify

| File | Action |
|---|---|
| `src/components/ui/MentionText.tsx` | New — renders plain text with @mentions as clickable spans |
| `src/components/ui/MentionTextarea.tsx` | New — textarea with @mention autocomplete dropdown |
| `src/pages/UserProfile.tsx` | Replace bio `<p>` with `<MentionText>` |
| `src/pages/Profile.tsx` | Replace bio `<p>` with `<MentionText>` |
| `src/components/events/EventDetailOverlay.tsx` | Replace description `<p>` with `<MentionText>` |
| `src/components/events/TimelineCard.tsx` | Replace description preview with `<MentionText>` (truncated) |
| `src/pages/EditProfile.tsx` | Replace bio `<Textarea>` with `<MentionTextarea>` |
| `src/pages/Create.tsx` | Replace description `<Input>` or `<Textarea>` with `<MentionTextarea>` |
| `src/components/events/EditEventSheet.tsx` | Replace description `<Textarea>` with `<MentionTextarea>` |

### MentionText component logic

```text
Input:  "Come party with @johndoe and @marysmith tonight!"
Output: 
  "Come party with "
  <span class="text-primary cursor-pointer" onClick→navigate("/user/johndoe")>@johndoe</span>
  " and "
  <span class="text-primary cursor-pointer" onClick→navigate("/user/marysmith")>@marysmith</span>
  " tonight!"
```

The regex: `/(@[a-zA-Z0-9_]+)/g` — splits and captures mention tokens.

Navigation uses username directly: `navigate('/user/' + username.slice(1))` — the existing UserProfile page is at `/user/:id` but accepts UUID, so we need a small resolution step. Since `useUserProfile(id)` accepts UUID, we'll add a `useUserByUsername` hook that queries `profiles` by username and returns the ID, OR we can navigate to a new route `/u/:username` that does the lookup. The cleaner approach: add a route `/u/:username` that resolves and redirects to `/user/:id`.

Actually, looking at the existing route structure, UserProfile uses `useParams({ id })` expecting a UUID. The simplest approach that requires no routing change: clicking an @mention fires a query `supabase.from('profiles').select('id').eq('username', username).single()` and then navigates to `/user/${id}`. This is a fast, indexed query.

### MentionTextarea component logic

```text
User types: "come party with @jo"
                                 ^cursor here

1. On every keydown/change, extract text behind cursor up to nearest whitespace
2. If it matches /@(\w+)$/, extract the partial query "jo"
3. Debounce 200ms, query profiles for username ilike 'jo%', limit 5  
4. Show dropdown below cursor position
5. User clicks "@johndoe" → replace "@jo" with "@johndoe " in the text
6. Dropdown closes
```

### No database changes needed

- Bio and description are already TEXT columns that can hold @mention strings
- No structural changes required — @mentions are parsed at render time from plain text

### Summary

This is purely a frontend enhancement. Two new reusable components (`MentionText` for display, `MentionTextarea` for input), then swap them into the relevant pages. No migration, no new tables, no RLS changes.
