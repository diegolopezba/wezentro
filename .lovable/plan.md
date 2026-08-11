# Fix keyboard behavior on mobile

Goal: when the keyboard opens, the page behind stays perfectly still. Only the sheet/input area lifts to sit right above the keyboard — the way Instagram, WhatsApp and Threads behave.

## What causes the jumping today

Three things fight each other whenever an input is focused:

1. `index.html` uses `interactive-widget=resizes-content`, so the browser shrinks the whole layout viewport when the keyboard appears. Every fixed element, the feed behind, and the bottom sheet all re-layout at once.
2. The native shell (`capacitor.config.ts`) uses `Keyboard.resize: 'body'`, which does the same thing again inside the native webview — the whole body is resized and the page reflows.
3. `useKeyboardAdjust` reacts to the resize and additionally calls `scrollIntoView({ behavior: "smooth", block: "center" })` on the focused field, which scrolls the background content — this is the visible "screen moves around / loses control" effect.

On top of that, the background page is never scroll-locked while a bottom sheet is open, so any keyboard-driven scroll leaks into the feed behind.

## How Instagram does it

- The layout viewport never resizes. The keyboard overlays the page.
- The page behind is scroll-locked and frozen in place.
- A single container (the composer / sheet) is translated upward by exactly the keyboard height, read from `window.visualViewport` (`height` + `offsetTop`), applied via `transform` so it is GPU-composited and does not trigger reflow.
- No `scrollIntoView`. If content inside the sheet needs to be reachable, the sheet's own inner scroll container handles it.

## Plan

**1. Stop the viewport from resizing**
- `index.html`: change `interactive-widget=resizes-content` to `resizes-visual` so the keyboard overlays instead of reflowing the layout.
- `capacitor.config.ts`: change `Keyboard.resize` from `'body'` to `'none'` and drop `resizeOnFullScreen`, so the native webview also lets the keyboard overlay. With `'none'`, positioning is fully ours to control, consistently on web and native.

**2. Rewrite `src/hooks/useKeyboardAdjust.ts` as a visualViewport-only observer**
- Compute keyboard height as `window.innerHeight - (visualViewport.height + visualViewport.offsetTop)` — accurate and free of the screen-height guessing / baseline-drift logic in the current version.
- Remove the `scrollIntoView` block entirely (this is the main source of the drift) and remove the orientation/focusout baseline resets, which are no longer needed.
- Expose a CSS variable `--keyboard-height` on `document.documentElement` so any component can lift itself with pure CSS, plus keep returning `{ isVisible, keyboardHeight }` for existing consumers such as `ChatDetail`.
- Mount this observer once globally (in `AppLayout`) instead of per-page, so the variable is always accurate.

**3. Lift sheets instead of resizing them**
- Add a `.keyboard-aware` utility in `src/index.css` that applies `transform: translate3d(0, calc(-1 * var(--keyboard-height, 0px)), 0)` with a short transition, and caps inner scroll height so long sheets stay usable.
- Apply it in `src/components/ui/drawer.tsx` (`DrawerContent`) and the bottom variant of `src/components/ui/sheet.tsx`, so every bottom sheet in the app — payment, menu, reservations, bulk invites, event actions, guestlist — gets the correct behavior with no per-sheet changes.

**4. Freeze the background**
- While a sheet with focus is open, lock `body` scrolling (`overflow: hidden` + `overscroll-behavior: none`) so the feed behind cannot move at all. Radix/vaul already lock on open; the addition is preventing the keyboard-driven scroll leak.
- For full-page inputs outside sheets (auth, create, edit profile, chat), the same `--keyboard-height` variable is used for bottom padding on the sticky action bar, so buttons stay reachable without the page jumping.

**5. Verify**
- Check the flows with the most typing: chat detail composer, comments, create/edit event, auth, and a light-theme sheet with inputs (bulk invite import, reservations).
- Confirm the background does not shift on focus, the sheet sits flush above the keyboard, and dismissing the keyboard restores position with no residual gap.

## Technical notes

- Using `transform` rather than `bottom`/`height` keeps the lift on the compositor — no layout thrash, which is what makes it feel native.
- `resizes-visual` is the default browser behavior, so this is a removal of a non-standard override rather than a new hack.
- No backend or business-logic changes; all edits are viewport config, one hook, one CSS utility, and the two sheet primitives.
