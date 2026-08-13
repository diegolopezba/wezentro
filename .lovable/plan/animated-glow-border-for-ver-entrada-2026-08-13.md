# Animated glow border for "Ver entrada"

Yes, this is possible. The button in the reference has a thin border with a light that travels around its perimeter — a rotating conic-gradient behind a pill-shaped mask. It works well in the app since the button is already a pill.

## What changes

- The "Ver entrada" button (event detail page and event detail overlay) keeps its current white pill look, size and behavior.
- It gains a thin animated border where a red/pink light rotates continuously around the edge, giving the magnetic feel of the reference.
- Motion is subtle (about 3s per loop) and respects reduced-motion settings: the border stays as a static gradient ring if the user disables animations.

## Technical notes

- Add a `.glow-border` utility in `src/index.css`: a wrapper with `rounded-full`, a `::before` layer using `conic-gradient` built from existing brand tokens (`--gradient-red` stops / accent red), animated with a `@property --angle` rotation keyframe, and the inner content sitting on the button background so only a ~1.5px ring shows.
- Register the rotation keyframes in `tailwind.config.ts` alongside the existing animation set; no hardcoded hex colors, tokens only.
- Wrap the existing `Button` in that element in `src/pages/EventDetail.tsx` (line ~518) and `src/components/events/EventDetailModal.tsx` (line ~471). No logic, routing, or state changes.
- Guard with `@media (prefers-reduced-motion: reduce)` to pause the animation.
