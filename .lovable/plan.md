## Problem

The notifications page shows a black area after scrolling past the initial batch. Root cause is in the virtualizer setup in `src/pages/Notifications.tsx`:

1. **`data-index` is wrong for measurement.** `measureElement` from `@tanstack/react-virtual` reads a numeric `data-index` attribute to update each row's true height. We set `data-index={notification.id}` (a UUID), so measurement never applies — every row stays at the 88px estimate. Rows that are actually taller (invitation cards with buttons, multi-line text) then overlap or leave the container short, cutting off the tail of the list.
2. **`scrollMargin` is captured once as 0.** `listStartRef.current?.offsetTop ?? 0` evaluates on the first render when the ref is still null, and virtualizer options don't re-sync when the ref later resolves. So the header offset (~60px safe-top + title) is never accounted for, shifting the visible window and making the last rows render outside what the virtualizer considers "in view."
3. **Positioning fights the parent container.** Rows are `position: absolute` with a manual `translateY`, but the outer scroll uses the window. Combined with the two bugs above, the effective content height is under-computed and scrolling past ~N items reveals an empty region.

## Fix

Small, targeted patch to `src/pages/Notifications.tsx` — no changes to notification data hooks or item components.

- Pass a numeric `data-index={v.index}` to the row wrapper so `measureElement` actually records real row heights.
- Track the list's `offsetTop` in state via a `useLayoutEffect` (updates on mount and on window resize), and feed that into the virtualizer as `scrollMargin` so it stays in sync.
- Keep the absolute-positioned virtual rows, but drive `translateY` from `v.start - scrollMargin` using the state value.
- Sanity-bump `overscan` (6 → 8) so tall rows entering the viewport measure before they need to be visible.

### Technical notes

- `useWindowVirtualizer` re-reads its options object each render, so keeping `scrollMargin` in state is enough — no imperative `.measure()` call needed.
- `AutoReadRow` still forwards `measureRef` to the same div; only the `data-index` attribute value changes.
- No schema, RLS, or query changes. Bulk read-marking and per-item hooks stay identical.

## Verification

- Type check the file.
- Reload `/notifications`, scroll to the bottom: confirm rows keep rendering past the previous cut-off and there is no black gap.
- Confirm unread dots and auto-mark-as-read still fire (bulk flush every ~400ms).