## Plan: fix the notifications blank screen when scrolling old items

### What I found
- The notifications page uses a window-level virtualizer, but the app content actually scrolls inside `AppLayout` (`overflow-auto` on an inner div), not the browser window.
- That mismatch can make the virtualizer think the wrong scroll position is active, so rows stop rendering and the user sees a black empty gap.
- The current row transform also subtracts `scrollMargin`, which can compound positioning issues inside the nested layout.

### Fix
1. Replace `useWindowVirtualizer` with `useVirtualizer` attached to the real scroll container.
2. Give `AppLayout` a ref on the notifications page so the virtualizer reads the same element the user is scrolling.
3. Remove the fragile `scrollMargin` measurement and use direct row positioning from the virtualizer.
4. Keep the current performance behavior: only visible notifications plus overscan mount, and unread dots still auto-clear after the row is visible.
5. Verify by loading `/notifications` in a mobile viewport and scrolling well past the first screen to confirm old rows keep appearing with no black gap.