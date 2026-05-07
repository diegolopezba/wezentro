# Carousel Posts (multi-media) for Events & Posts

Add Pinterest/Instagram-style carousels: up to 5 mixed photos/videos per event or post, swipeable directly inside feed cards. Migrate existing single-media content to a unified media array.

## 1. Data model

New table `event_media`:
- `event_id` (FK → events)
- `media_url` (text)
- `media_type` ('image' | 'video')
- `display_order` (int, 0-4)
- `aspect_ratio` (numeric, optional — used for card sizing)
- standard id/created_at

RLS: public SELECT for media on public events; INSERT/UPDATE/DELETE only by event creator.

Backfill migration:
- For every existing `events` row with `image_url`, insert one `event_media` row at `display_order = 0`.
- Keep `events.image_url` as a denormalized "cover" pointing to media #0 (used by share previews, OG tags, sponsored ads, notifications). Updated automatically when media #0 changes.

A trigger keeps `events.image_url` in sync with the first media item.

## 2. Creation flow (`src/pages/Create.tsx`)

Replace the single `mediaFile` state with `mediaItems: { file, preview, type, aspect }[]` (max 5).
- Plus tile at the end of the row to add more (until 5).
- Each item shows a small × to remove and drag-handle to reorder.
- Validate each item with existing `validateVideoFile` / `validateImageFile` rules (30s, 20MB, 720p, WebP compression).
- Upload sequentially with a progress indicator, then insert event row + bulk insert into `event_media`.

## 3. Reusable `<MediaCarousel />` component

`src/components/events/MediaCarousel.tsx` — used in both feed cards and detail view.
- Embla carousel (already in deps) with `dragFree: false`, snap per slide.
- Lazy-loads off-screen items; only the active slide auto-plays video; others pause + mute.
- Shows dot indicator at the bottom (or `1/5` pill in top-right when >3 items).
- Preserves the card's dynamic aspect ratio: uses the **first** item's aspect to size the card; subsequent items are object-cover within that frame (Pinterest behavior — feed never reflows).
- Tap (no swipe) opens the detail view at the current slide.
- Sound toggle behaves as today, applies to active video.

## 4. Cards & feed integration

Update `EventCard.tsx` and `TimelineCard.tsx`:
- Replace single `<img>/<video>` block with `<MediaCarousel items={...} />`.
- Add `media: AttendeeMedia[]` prop fed from the new query (falls back to `[{ url: image_url, type }]` if empty).
- Memo comparator updated to include `media.length` and first item id.

Sponsored cards keep single-media for now (out of scope unless asked).

## 5. Detail view

`EventDetailModal.tsx` + `EventDetail.tsx` swap their hero media block for the same `<MediaCarousel />`, opened at the index the user tapped from the feed (passed via `useOpenEvent`).

## 6. Queries

- `useEvents`, `useFollowingEventsScored`, `useForYouEvents`, `useUserTimeline`, `useRelatedEvents`, `useNearbyEvents`, etc. join `event_media` (ordered by `display_order`) and return a `media` array per event.
- Update the `get_for_you_events` SQL function to aggregate `event_media` into a `jsonb` column.
- Type updates flow through automatically once `event_media` is in the schema.

## 7. Edits

`EditEventSheet.tsx` gains the same multi-item editor (add/remove/reorder), syncing back to `event_media`.

## Out of scope

- Mixing media in sponsored ads (still single).
- Per-slide alt text or captions.
- Advanced reorder gestures beyond drag-handle.

## Technical notes

- Use Embla's `selectedScrollSnap()` to drive the active-video logic.
- Keep `image_url` column for backwards compat & external embeds — never remove it.
- 5-item cap enforced both client-side and via a CHECK constraint on `display_order BETWEEN 0 AND 4`.
- Soft-deletes cascade: when an event is soft-deleted, media rows stay (no hard delete) but are filtered by the event's `deleted_at`.
