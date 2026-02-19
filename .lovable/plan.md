
# Floating CTA Bar for Event Details

## What Changes

Move the "Unirse" / "Comprar" / "Gestionar" button out of the inline action row and into a floating bottom bar, similar to dice.fm. The bar will show:
- **Left side**: Event price (e.g., "$15.000") or "Gratis"
- **Right side**: The CTA button (Unirse / Comprar / Gestionar / Pendiente / Unido)

The inline action row will keep only the social buttons (Like, Repost, Share, Save, Invite) plus the three-dot menu.

## Visual Layout

```text
+------------------------------------------+
|  $15.000                      [ Unirse ] |
+------------------------------------------+
```

- Glass/blur background, fixed to bottom, with safe-area padding
- Only shown for events with a guestlist (not for posts)
- Content area gets extra bottom padding to avoid overlap

## Files Modified

1. **src/pages/EventDetail.tsx**
   - Remove the join/manage button from the inline action row (lines ~332-344)
   - Add a fixed floating bar at the bottom with price + CTA
   - Add extra bottom padding to the content area (`pb-28` instead of `pb-8`)

2. **src/components/events/EventDetailOverlay.tsx**
   - Identical changes: remove join/manage from inline row (lines ~328-340)
   - Add the same floating bottom bar
   - Add extra bottom padding

## Technical Details

- The floating bar uses `fixed bottom-0 left-0 right-0` with `glass-strong` styling and `safe-bottom` padding
- For the overlay, it uses `absolute` positioning within the overlay container instead of `fixed`
- The bar is conditionally rendered only when `event.has_guestlist` is true and the event is not a post
- All existing button states (owner/pending/approved/not joined) and loading states are preserved exactly as-is
- The three-dot dropdown menu stays in the inline row
