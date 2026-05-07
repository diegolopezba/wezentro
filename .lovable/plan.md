# Increase attendee avatar size below cards

Bump the small attendee avatars row that appears below event cards so it's more visible.

## Changes

**`src/components/events/EventCard.tsx`** and **`src/components/events/TimelineCard.tsx`**

- Avatar size: `w-5 h-5` → `w-6 h-6` (owner + attendees + placeholders).
- Use `ImageSizes.avatarSm` instead of `avatarXs` for sharper rendering.
- Slightly increase overlap spacing: `-space-x-1.5` → `-space-x-2`.
- Bump count text: `text-[10px]` → `text-xs`.

Nothing else changes — same logic, same position (below the title).
