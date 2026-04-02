

## Fix: Reservation Button Color Inconsistency

### Root Cause
The "Reservar" button is styled differently in the two detail views:
- `EventDetail.tsx` uses `variant="hero"` (red gradient — correct)
- `EventDetailOverlay.tsx` uses the default variant (grey) with a custom `gradient-primary` class that doesn't reliably override the grey

### Fix
**File: `src/components/events/EventDetailOverlay.tsx`** (line ~448-450)

Replace the current Button with:
```tsx
<Button
  variant="hero"
  size="default"
  onClick={() => setShowReservationSheet(true)}
>
```

Remove the custom `className` and use `variant="hero"` to match EventDetail.tsx — one line change.

