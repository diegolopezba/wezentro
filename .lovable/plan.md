
## Plan: Merge Tag Modal into @mention System

### What exists today

1. **TagPickerModal + `event_tags` table** — a separate "Tag Accounts" card in the Create page lets users pick users via a modal. On submit, it inserts rows into `event_tags`, which triggers `handle_event_tag()` DB function → `post_tag` notification → tagged user sees accept/decline in the notifications page via `PostTagNotificationItem`.

2. **MentionTextarea** — the description field now supports `@username` autocomplete. But typing `@john` in a description does NOT insert into `event_tags` or send any notification.

### Goal

When a user types `@username` in a description and publishes, automatically:
- Parse the description for `@username` patterns
- Resolve each username to a user ID (batch lookup against `profiles`)
- Insert into `event_tags` (so the existing notification trigger fires automatically)
- The tagged user still gets the `post_tag` notification and can still accept/decline from the Notifications page — nothing changes there
- Remove the separate "Etiquetar cuentas" card and `TagPickerModal` from the Create page
- Remove the same from EditEventSheet if present

### What changes

**1. `src/pages/Create.tsx`**
- Remove `TagPickerModal` import and its JSX block at the bottom
- Remove `AtSign` import (if unused after), `TagPickerModal` import, `useTagUser` import, `selectedTaggedUsers` state, `showTagPicker` state, `SearchUser` import (if unused)
- Remove the entire "Tag accounts section" card (lines ~672–736)
- In `handleSubmit`, after the event is inserted, extract `@username` mentions from the description using a regex, batch-query `profiles` by those usernames to get their IDs, then insert into `event_tags` for each one (reusing the existing `supabase.from("event_tags").insert(...)` logic). The existing DB trigger will fire the notification automatically.
- Keep the `MentionTextarea` for description input (already in place)

**2. `src/components/events/EditEventSheet.tsx`**
- Check if it also has the TagPickerModal UI — if so, apply the same removal and add the same post-save mention parsing + `event_tags` insert logic

**3. `src/components/events/TagPickerModal.tsx`**
- Delete this file entirely (or leave it since no other file imports it after Create.tsx is cleaned — either way the import removal makes it dead code; deletion is cleaner)

### How mention-to-tag parsing works in `handleSubmit`

```text
1. After event insert succeeds and we have data.id:
2. Parse description: extract all @username tokens via /(?<!\w)@([a-zA-Z0-9_]+)/g
3. Deduplicate usernames, exclude the creator's own username
4. Batch query: SELECT id, username FROM profiles WHERE username = ANY(usernames)
5. For each resolved user: INSERT INTO event_tags (event_id, tagged_user_id, tagged_by) VALUES (...)
6. DB trigger handle_event_tag() fires automatically → inserts notification for tagged user
7. Tagged user sees the accept/decline UI in Notifications page (unchanged)
```

No DB migration needed — `event_tags` table and the `handle_event_tag` trigger already exist and work correctly.

### No changes needed to

- `PostTagNotificationItem` — already works perfectly
- `useEventTags` / `useRespondToTag` hooks — unchanged
- Notifications page — unchanged
- `MentionText` display component — unchanged
- `MentionTextarea` input component — unchanged

### Files to modify/delete

| File | Action |
|---|---|
| `src/pages/Create.tsx` | Remove TagPickerModal section + state, add mention parsing logic in handleSubmit |
| `src/components/events/EditEventSheet.tsx` | Same if it has tag UI; add mention parsing on save |
| `src/components/events/TagPickerModal.tsx` | Delete |
