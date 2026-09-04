# Add fancy border glow to “Impulsar Publicación” button

## Goal
Apply the same rotating magnetic border glow shown in the uploaded video to the “Impulsar Publicación” button on the analytics/dashboard page.

## Current state
- The desired effect already exists as the `.glow-border` utility in `src/index.css`.
- The target button is in `src/components/dashboard/QuickActions.tsx` and currently uses `.boost-glow-btn` (a background shimmer), not the rotating border glow.
- Existing usage of `.glow-border` wraps the element, e.g. `<span className="glow-border"><Button … /></span>`.

## Change
1. In `src/components/dashboard/QuickActions.tsx`, wrap the `Button` in a `<span className="glow-border">`.
2. Keep the button itself `rounded-full` so the inner mask matches the glow ring.
3. Remove the old `.boost-glow-btn` class to avoid conflicting background animation.
4. Preserve the `onBoostClick` handler, icon, and label text.

## Verification
- Build/typecheck passes.
- Visual check in preview confirms the rotating red glow ring around the pill button.

## Scope
Only the presentation of this single button; no data, backend, or other UI changes.