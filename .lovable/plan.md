
## Remove Group Chat Feature from Events

### What needs to change

The group chat feature for guestlist events is spread across 5 areas:

1. **DB trigger** — `create_event_group_chat` fires on every event INSERT and creates a chat row. Needs to be dropped via a migration. The `has_guestlist_chat` column can remain (it's already in the schema and removing it would be a bigger migration) — we just stop using it.

2. **`useGuestlist.ts`** — Three hooks (`useJoinGuestlist`, `useJoinGuestlistWithPayment`, `useLeaveGuestlist`) each do a lookup for the event chat and add/remove the user. All three chat-related blocks need to be removed.

3. **`Create.tsx`** — Remove the `hasGuestlistChat` form field, its default value, the toggle UI (the entire animated section inside `{formData.hasGuestlist && ...}`), and stop passing `has_guestlist_chat` to the insert.

4. **`EditEventSheet.tsx`** — Remove `has_guestlist_chat` from the form state, the `useEffect` sync, the save payload, the interface prop, and the entire "Chat grupal" toggle UI block (lines ~324–341).

5. **`useEventMutations.ts`** — Remove `has_guestlist_chat` from the `UpdateEventData` interface.

6. **`useSubscription.ts`** — Remove "Accede a chats grupales de eventos" from the Premium plan features list.

### Database migration

Drop the trigger (which auto-creates chats on event insert) and drop the function:

```sql
DROP TRIGGER IF EXISTS on_event_created_create_group_chat ON public.events;
DROP FUNCTION IF EXISTS public.create_event_group_chat();
```

The `has_guestlist_chat` column stays in the DB (safe to leave, just ignored). No data is deleted. Existing event-type chats already in the `chats` table will remain but will no longer appear since no new ones are created and the UI paths to join them are removed.

### What is NOT removed

- Private 1:1 chats — completely untouched
- `EventInviteCard` / `GuestlistInviteCard` in private chats — untouched (these are cards shared inside private DMs, unrelated to the group chat feature)
- The `Chats` page and `ChatDetail` page — untouched (still needed for private messaging)

### Files to edit

| File | Change |
|---|---|
| New migration | Drop trigger + function |
| `src/hooks/useGuestlist.ts` | Remove chat lookup/insert/delete blocks in all 3 hooks |
| `src/pages/Create.tsx` | Remove `hasGuestlistChat` state + toggle UI + field from insert |
| `src/components/events/EditEventSheet.tsx` | Remove `has_guestlist_chat` state + toggle UI + field from save |
| `src/hooks/useEventMutations.ts` | Remove `has_guestlist_chat` from interface |
| `src/hooks/useSubscription.ts` | Remove group chat feature bullet |
