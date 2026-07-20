# Fix: Notifications back button sometimes does nothing

## Root cause (verified)

`src/pages/Notifications.tsx` line 473 uses:

```tsx
<Button ... onClick={() => navigate(-1)}>
```

When the Notifications page is the first entry in the browser history stack — which happens when the user opens it from a push notification, a deep link, a shared URL, or after a hard refresh on `/notifications` — `navigate(-1)` is a no-op and nothing happens.

The swipe-back gesture (`src/hooks/useSwipeBack.ts`) does the same `navigate(-1)`, but with a fallback:

```ts
if (window.history.length > 1) {
  navigate(-1);
} else {
  navigate("/");
}
```

That's why swiping works and tapping doesn't.

## Fix

Apply the same guarded-back pattern to the header button in `src/pages/Notifications.tsx`:

```tsx
const handleBack = () => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate("/");
  }
};
```

Wire it into the header `<Button onClick={handleBack}>`.

## Optional follow-up (not included unless you want it)

Several other pages (`Settings`, `Saved`, `EditProfile`, etc.) use the same bare `navigate(-1)` and would have the same bug when opened via deep link. If you want, I can sweep and apply the same guard across all detail pages in a second pass — say the word and I'll do it after this fix.

## Files touched

- `src/pages/Notifications.tsx` — replace inline `navigate(-1)` with the guarded `handleBack` handler.

No backend, hooks, or styling changes.
