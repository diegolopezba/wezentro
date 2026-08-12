# Stabilize mobile keyboards in bottom sheets

## Goal
Keep the page and backdrop visually fixed when the mobile keyboard opens. Only the sheet's usable content area should resize, and the focused field plus its action bar should remain visible without jumping, stretching, or revealing the page underneath.

## Confirmed findings
- The app globally derives a keyboard height from `visualViewport` and exposes it as CSS state (`src/hooks/useKeyboardAdjust.ts:22-47`).
- The shared drawer primitive translates the entire sheet by that keyboard height (`src/components/ui/drawer.tsx:27-45`, `src/index.css:250-269`).
- Vaul 0.9.9 also enables its own `repositionInputs` behavior by default and directly changes drawer `height` and `bottom` on `visualViewport.resize`. This means drawer-based sheets can receive two independent corrections.
- The main Vaul bottom-sheet primitive uses Vaul's correction, while comments and event editing impose fixed `vh/dvh` heights (`src/components/events/CommentsSheet.tsx:82-85`, `src/components/events/EditEventSheet.tsx:463-467`, `src/components/events/EventActionsSheet.tsx:97-104`). This produces inconsistent behavior between sheet families.
- The current CSS correction transforms the whole sheet rather than resizing its internal viewport. That moves headers and the sheet frame upward and can conflict with Vaul drag transforms.
- Comments automatically call `scrollIntoView` when comments change (`src/components/events/CommentsSheet.tsx:42-46`), which can scroll an outer document or portal during keyboard transitions.
- The app currently combines `interactive-widget=resizes-visual` with `Keyboard.resize: 'none'`, so keyboard avoidance must be owned consistently by the app rather than partly by native resize (`index.html:5`, `capacitor.config.ts:33-37`).

## Implementation plan

### 1. Establish one keyboard viewport controller
- Refactor the existing observer to publish the visual viewport's height, top offset, and keyboard-open state in one animation-frame-coalesced update.
- Calculate against a stable baseline so URL-bar movement, pinch/zoom, orientation changes, and small viewport fluctuations are not mistaken for a keyboard.
- Reset all CSS state reliably on blur, keyboard close, orientation change, and component cleanup.
- Keep native WebView resize disabled so the web layout and controller do not both compensate.

### 2. Make the shared bottom-sheet primitive own keyboard behavior
- Turn off Vaul's built-in input repositioning in both shared Vaul wrappers to prevent its inline `height`/`bottom` mutations from competing with the app controller.
- Remove the full-sheet `translateY(-keyboardHeight)` behavior.
- Size the sheet against the visible viewport while the keyboard is open, with a stable top boundary and contained internal scrolling; leave the fixed overlay/background anchored to the layout viewport.
- Preserve drag-to-close when the keyboard is closed, but suppress drag conflicts while typing or scrolling inside a form.
- Centralize safe-area and keyboard inset handling in the primitive instead of requiring every feature sheet to improvise it.

### 3. Normalize input-heavy sheet structure
- Update comments, event/post editing, menu editing, reservations, invitations, reports, and other input-bearing sheets to the same structure: fixed header, one `min-h-0 overflow-y-auto` content region, and fixed composer/action footer.
- Replace conflicting `vh/dvh` constraints with shared keyboard-safe sizing tokens.
- Mark form/scroll regions as non-draggable where needed so text selection and scrolling do not move the sheet.
- In comments, replace unconditional document-level `scrollIntoView` calls with scroll-container-local positioning, scheduled only after layout settles.
- When a focused field would be covered, reveal it inside the sheet's own scroller using `block: nearest`; never scroll the page behind the portal.

### 4. Lock and restore the background correctly
- Ensure opening a modal sheet freezes the existing page scroll position without shifting the feed or modal route.
- Keep the overlay full-screen and visually unchanged during keyboard animation.
- Restore the exact background scroll position and clear temporary inline styles when a sheet closes, unmounts, or navigation occurs.
- Prevent nested gate sheets and select/popover controls from leaving stale body styles or applying a second keyboard correction.

### 5. Regression coverage and verification
- Add focused tests for viewport calculations, keyboard open/close cycles, small browser-chrome resizes, orientation changes, and cleanup.
- Add component tests confirming the shared sheet disables Vaul repositioning and uses one scrollable content region without transforming the outer sheet.
- Smoke-test at mobile dimensions on comments and event editing, then cover menu, reservations, invitations, report, payment, and nested-sheet flows.
- Verify on iOS Safari/PWA/WKWebView and Android Chrome/WebView: keyboard open/close, switching fields with Next/Previous, multiline input, scrolling long forms, drag dismissal, rotation, and repeated open/close cycles.
- Acceptance criteria: the background and overlay do not move; the sheet top does not jump; focused fields and footer controls remain visible; no blank gap appears above the keyboard; closing the keyboard restores the exact prior geometry and scroll position.

## Standards used
- Follow the visual viewport model documented by WebKit and Chromium for on-screen keyboards.
- Use a single compensation owner, as recommended for Capacitor/WebView integrations, to avoid double resize/translation.
- Treat `interactive-widget` as a progressive enhancement because support differs across current Safari/WebView versions.
- Avoid relying on Vaul's current automatic keyboard repositioning because its own viewport mutation conflicts with the app-wide controller and remains a documented source of iOS sheet issues.
