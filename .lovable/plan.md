
# Plan: Remove usernames below "People Going" avatars

## Goal
Delete the username text line that appears under the stacked avatars in the "Personas que van / Personas que sigues que van" section on event detail views.

## Files and changes

### `src/pages/EventDetail.tsx`
Remove lines 367-371 — the `<p className="text-sm text-muted-foreground mt-2">` block that renders `@username1, @username2 y N más van`.

### `src/components/events/EventDetailModal.tsx`
Remove lines 379-383 — the identical `<p>` block in the modal overlay version.

## What stays
- The stacked avatar images (up to 5).
- The `+N más` overflow badge.
- The section header (`Personas que van...`).
- The attendee count in the header parenthetical.

## Out of scope
- Any other layout, spacing, or sizing changes to the avatar stack.
