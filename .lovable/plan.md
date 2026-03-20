
## Mobile Keyboard Optimization — Native App Priority

### Context

The app runs as a Capacitor native app on iOS/Android, where the keyboard behavior is:
- **iOS (Capacitor)**: With `Keyboard: { resize: 'body' }` in capacitor.config.ts, iOS already resizes the body when the keyboard opens. This means layouts using `min-h-screen` or `h-screen` will shrink correctly. However, **sticky/fixed bottom elements** and `safe-bottom` padding can still fight the resize, causing the input bar to be pushed too far up or hidden.
- **Android (Capacitor)**: With `resize: 'body'`, the WebView resizes. `h-[100dvh]` is the most reliable fix for full-screen layouts.

The existing `useKeyboardAdjust` hook (visualViewport-based) is solid but unused. The safe-area CSS utilities exist. The Capacitor keyboard plugin is already configured with `resize: 'body'`.

---

### Files to Change

**1. `index.html`** — Add `interactive-widget=resizes-content` to viewport meta for Android Chrome (PWA/browser users)

**2. `src/pages/ChatDetail.tsx`** — Most critical fix:
- Replace `min-h-screen bg-background flex flex-col` with `h-[100dvh] flex flex-col bg-background`
- The messages area already has `flex-1 overflow-y-auto` — keep as-is
- The input bar: remove `sticky bottom-0` and `safe-bottom` class, replace with a plain `shrink-0` div with `pb-4`. With `resize: 'body'`, the whole page shrinks so the sticky bottom doesn't need safe-area padding when keyboard is open
- Add `useKeyboardAdjust` hook to toggle between `pb-safe` (keyboard closed) and `pb-2` (keyboard open) for the input wrapper

**3. `src/pages/Auth.tsx`** — Fix form being pushed off-screen:
- Change outer `overflow-hidden` → `overflow-y-auto` so the form can scroll when keyboard opens
- Wire `useKeyboardAdjust`: when keyboard is visible, set `pt-6 pb-4` on the logo section instead of `pt-20 pb-10`, and optionally hide the logo image (keep the "zentro" text)
- This ensures the login/signup form fields remain reachable

**4. `src/pages/Onboarding.tsx`** — Same issue as Auth:
- The outer wrapper uses `flex flex-col` without overflow. Add `overflow-y-auto` to make it scrollable
- Wire `useKeyboardAdjust`: collapse the logo/header section (`pt-16 pb-6` → `pt-4 pb-2`, hide logo icon) when keyboard is visible

**5. `src/pages/Create.tsx`** — Already uses `AppLayout` which is `overflow-auto`. The main concern is the description `MentionTextarea` and location picker being below the fold:
- Add `scrollIntoView` on `onFocus` for the MentionTextarea and any text Input elements inside the form so they auto-scroll into view when tapped

**6. `src/components/reservations/ReservationSheet.tsx`** — The Drawer has `max-h-[92vh] flex flex-col` with `flex-1 overflow-y-auto` on the inner container — this is structurally correct. The fix:
- On the "extras" step, the notes Textarea is the last element. Add an `onFocus` handler that calls `scrollIntoView` so the notes field scrolls into view when tapped on a small screen with keyboard open

**7. `src/hooks/useKeyboardAdjust.ts`** — Minor improvement: instead of comparing against a captured `initialHeight` (which can drift), use `window.screen.height` as the reference baseline, which is more stable on native:
```ts
const baselineHeight = window.screen.height * 0.75; // keyboard visible if viewport < 75% of screen
```
Actually — keep current approach but reset `initialHeight` more reliably on focus events.

---

### Summary of Changes

| File | Change |
|---|---|
| `index.html` | Add `interactive-widget=resizes-content` to viewport meta |
| `ChatDetail.tsx` | `h-[100dvh]` layout + keyboard-aware input padding |
| `Auth.tsx` | `overflow-y-auto` + collapse logo on keyboard open |
| `Onboarding.tsx` | `overflow-y-auto` + collapse header on keyboard open |
| `Create.tsx` | `scrollIntoView` on focus for text inputs below the fold |
| `ReservationSheet.tsx` | `scrollIntoView` on Textarea focus in extras step |

No new dependencies. All changes use existing hook + CSS utilities already in the project.
