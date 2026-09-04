# Pinterest-style two-column desktop layouts

Bring the desktop (`lg+`) layout of the event/post detail overlay and the Create page in line with Pinterest: media on the left, content on the right, related items below. Mobile stays byte-for-byte identical in behavior.

## Detail overlay (event / post / experience)

Today the desktop overlay is a centered card that stacks media on top and content below — the same vertical order as mobile, just narrower.

New desktop structure inside the overlay card:

```text
+--------------------------------------------------+
|  [media carousel]      |  title, host, date,      |
|  sticky, max height    |  price, description,     |
|  fills left column     |  actions, attendees,     |
|                        |  comments teaser         |
+--------------------------------------------------+
|  "Más como esto" related masonry (full width)     |
+--------------------------------------------------+
```

- Two columns at `lg+`: media ~55%, info ~45%, both inside the existing max-width card.
- Media column is sticky within the card so long right-column content scrolls past it.
- The right column scrolls; the whole card keeps one scroll container as today.
- Related events grid moves below both columns, spanning full card width.
- The bottom fixed action bar (Comprar / Reservar) becomes an inline sticky bar at the bottom of the right column on desktop instead of a viewport-fixed bar.
- Close button stays top-left over the media.
- Mobile keeps the current single-column stack.

## Create page

Same split at `lg+`:

- Left column: the media picker / cover preview / carousel thumbnails, sticky.
- Right column: all form fields (title, description, category, date/time, location, tickets, lounges, toggles) and the publish button.
- Page container widens on desktop and centers within the nav-rail shell.
- Mobile keeps the current single-column, top-to-bottom order.

## Reusable pattern

Introduce a small layout primitive (e.g. `DetailSplitLayout`) with `media` and `content` slots that renders a plain stack on mobile and the sticky two-column split at `lg+`, so the same pattern can be applied later to experience detail, business event detail, and other media-first pages without repeating the grid classes.

## Technical notes

- Files: `src/components/events/EventDetailModal.tsx`, `src/pages/EventDetail.tsx` (standalone route), `src/pages/Create.tsx`, new `src/components/layout/DetailSplitLayout.tsx`.
- All desktop rules via Tailwind `lg:` classes only; no `useIsDesktop` branching for structure so the DOM stays stable and Capacitor/mobile is untouched.
- No changes to data fetching, hooks, payments, or database.
