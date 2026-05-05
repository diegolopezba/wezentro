# Move attendee avatars below the card

Currently, when an event has people going, their avatars are shown overlaid on the top-left corner of the card image. This can blend into the photo and feel hidden. We'll move that little avatars + count row to **below** the card — under the title text (if any) — so it's clearly visible.

## What changes

`**src/components/events/EventCard.tsx**`

- Remove the absolute-positioned attendees block (currently top-left overlay, lines ~258–311).
- Add a new attendees row inside the bottom content section, placed **after** the title:
  - Same stacked avatars (owner first, then up to 4 others, then placeholders).
  - Same `attendees` count number next to them.
  - Slightly larger avatars (e.g. `w-5 h-5`) since they're no longer over a photo and won't need a dark backdrop.
  - Uses normal foreground text color instead of overlay-on-image styling.
  - Container padded with `px-1` to match the existing title row.

`**src/components/events/TimelineCard.tsx**`

- Same change: remove the top-left overlay attendees block and render the row at the bottom, after the title and date.

## What stays the same

- Logic for which avatars to show (owner + filtered + placeholders).
- Owner avatar click navigation to `/user/{creatorId}`.
- The "Not interested" 3-dot menu and the video sound toggle remain in the top-right of the image.
- Sponsored badge and repost attribution remain above the card.
- Posts (no attendees displayed) are unaffected.

## Visual result

```text
[ event image ]
Title text here
[👤👤👤] 12
```

Instead of the avatars floating over the image's top-left corner.