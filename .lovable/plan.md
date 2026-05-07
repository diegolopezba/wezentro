## Goal

Tighten vertical rhythm on the event detail page (and matching sheet modal) so the title, action buttons, host info, about section, comments, etc. sit closer together — a denser, more Pinterest-like detail view.

## Changes

### 1. `src/pages/EventDetail.tsx`
- Change the main content stack from `space-y-6` → `space-y-3` (line 158).
- Tighten the content wrapper top padding: `pt-4` → `pt-3` (line 151).

### 2. `src/components/events/EventDetailModal.tsx`
- Change the main content stack from `space-y-6` → `space-y-3` (line 168).
- Tighten the content wrapper top padding to match (`pt-4` → `pt-3`, line 163).

### Notes
- Keeping `space-y-2` on inner sub-blocks (description block, etc.) since those are already tight.
- No changes to font sizes or section internals — only the gaps between top-level sections.

## Verification
- Reload `/event/:id` and the modal sheet; confirm the gaps between title → action row → host → about → comments are visibly tighter while still readable.

## Out of scope
- No changes to other pages, no font/size changes, no logic changes.
