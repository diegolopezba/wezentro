## Goal

Make account deletion fully clean up everything the user owns: database rows (already mostly OK via cascades), **uploaded files in storage**, pending invitation rows that currently have no cascade rule, and **orphan chats** left behind when both 1:1 participants are gone. Today the `delete-account` edge function only calls `auth.admin.deleteUser`, which leaves storage objects, some FKs, and empty chats behind.

## Changes

### 1. Database migration — close the cascade gaps

- `guestlist_invitations`: drop and re-create the FKs `inviter_id` and `invited_user_id` with `ON DELETE CASCADE` (today they're NO ACTION → they could block deletion if pending invitations exist).
- Add a small `AFTER DELETE` trigger on `chat_participants` that deletes the parent `chats` row when no participants remain (covers 1:1 chats whose two participants both deleted their accounts).

No data is migrated — only constraint/trigger changes.

### 2. Edge function `delete-account` — wipe the user's storage files before deleting the auth user

The `event-images` bucket holds avatars + event photos/videos. The function should, before `admin.deleteUser`:

1. List all storage objects in `event-images` whose path starts with `{user.id}/` (the existing upload paths follow this convention) and remove them with the service-role client.
2. Same sweep for any other buckets the project may add later (today only `event-images`).
3. Then proceed with the existing `admin.deleteUser` cascade.

Wrap each step in try/catch + log so a single storage hiccup doesn't block the auth deletion (we'd rather fully delete the user than leave them half-deleted; orphan files can be reaped later).

### 3. Verify

After implementing:
- Create a throwaway test account → upload an avatar + create a post with media → request deletion.
- Confirm: profile gone, events gone, storage path `event-images/{uid}/...` empty, no rows in `guestlist_invitations` referencing the user, any 1:1 chats they were the sole remaining party in are gone.

## Out of scope (deliberately kept)

- **Messages they sent in chats with other people** stay (anonymized via `sender_id → SET NULL`). Standard behavior, prevents holes in other users' chat history.
- **Anonymous analytics rows** (`event_interactions`, `profile_visits.visitor_id`) stay anonymized. No personal data, useful for businesses.
- No "soft delete / 30-day grace period" — sticking with the current immediate-delete UX unless you want that added later.

## Files touched

- `supabase/migrations/<new>.sql` — FK + trigger fixes
- `supabase/functions/delete-account/index.ts` — storage sweep added
