

## Fix: Terms checkbox not toggling on tap

**Problem**: The `<label>` on line 317 wraps the checkbox div and the text, but has no `onClick` handler. Only clicking the small 20x20 checkbox `div` (line 322) toggles the state. Tapping the surrounding text does nothing, and tapping the link buttons navigates away from the page.

**Fix in `src/pages/Auth.tsx`**:

1. Add an `onClick` handler to the outer `<label>` element that toggles `termsAccepted`
2. Keep `e.stopPropagation()` on the two navigation buttons so they don't also toggle the checkbox
3. Add `e.preventDefault()` to the label click to prevent default label behavior that could cause double-toggling on the checkbox div itself

This way, tapping anywhere on the row (except the Terms/Privacy links) will check the box — matching standard mobile UX patterns.

