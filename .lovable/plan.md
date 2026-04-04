

## Shrink map popup event card

The popup container currently spans `left-4 right-4` (full width minus 16px padding each side), so the card fills nearly the entire screen width and the image dominates vertically.

### Changes

**File: `src/pages/Discover.tsx` (line 399)**

Change the container class from:
```
className="absolute bottom-20 left-4 right-4 z-50"
```
to:
```
className="absolute bottom-20 left-8 right-8 z-50 max-w-[220px] mx-auto"
```

This constrains the card to ~220px wide and centers it, making it feel like a compact preview card rather than a full-width overlay. The `compact` prop already removes the forced aspect ratio and max-height, so the image will scale down proportionally with the narrower width.

