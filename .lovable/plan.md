

## Fix: Match EventFeed spacing to Profile masonry grid

**Problem**: The home feed uses Tailwind classes (`columns-2 gap-3 px-4`) which produce `column-gap: 12px` and `padding: 0 16px`. The profile page uses the `.masonry-grid` CSS class which has `column-gap: 4px` and `padding: 0 4px`. This makes the home feed look noticeably more spaced out.

**Fix in `src/components/events/EventFeed.tsx`** (line 139):

Replace:
```html
<div className="columns-2 gap-3 px-4 [column-fill:_balance] w-full">
```

With:
```html
<div className="masonry-grid w-full">
```

This reuses the existing `.masonry-grid` CSS class (4px gap, 4px padding) that the profile, saved, joined events, and related events pages all use. The `[column-fill:_balance]` is unnecessary since the CSS class already handles column behavior.

The child wrapper `break-inside-avoid mb-3` should change to use the existing `.masonry-item` class (which has `break-inside: avoid` and `margin-bottom: 12px` — same 12px, just via CSS instead of Tailwind).

One file, two class name changes.

