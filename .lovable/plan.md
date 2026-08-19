# Fix the garbled "Descripción" input on the create page

## What's happening

The description field is not a plain textarea. It's a custom control (`MentionTextarea`) that stacks two layers: a real textarea whose text is made fully transparent (only the caret shows), and a "mirror" layer behind it that re-renders the same text with `@mentions` highlighted in blue. What you see while typing is the mirror, so if the two layers don't wrap text identically, the letters and spaces appear smeared, doubled or offset — exactly the effect described, and it's worst on narrow mobile widths where wrapping happens constantly.

Three concrete mismatches in the current implementation:

1. Both layers use `display: flex`. A flex container does not lay out raw text the way a textarea does — text nodes become flex items, so spaces and line breaks collapse and wrapping diverges between the two layers.
2. The mirror converts newlines to `<br/>` while also using `whitespace-pre-wrap`, so every newline renders twice — the mirror drifts one line down from the caret after the first Enter.
3. The mirror inherits the caller's classes (padding, min-height, border radius, font size) but its border is forced transparent while the textarea keeps a real border, and the mirror clips overflow instead of scrolling with the same box — so once the text is longer than the box, the two layers scroll out of sync.

Also on this page the field auto-scrolls itself into view 300ms after focus, which fights the app's keyboard handling and adds to the "jumping while typing" feeling on mobile.

## Fix

1. Rewrite the layering inside `src/components/ui/MentionTextarea.tsx`:
   - Use `display: block` on the mirror and the textarea, identical box model (same padding, border width, font, line-height, letter-spacing, min-height), so wrapping is character-for-character identical.
   - Mirror keeps `whitespace: pre-wrap` and `overflow-wrap: break-word`, and stops injecting `<br/>` — the newline characters carry themselves.
   - Give the mirror a transparent border of the same width as the textarea's border instead of no border, so text origin matches.
   - Keep scroll sync, and mirror the textarea's scroll height so long descriptions stay aligned.
2. Remove the 300ms `scrollIntoView` on focus in `src/pages/Create.tsx`; the global keyboard viewport handling already keeps the field visible.
3. Verify on a mobile viewport in the preview: type multi-line text with spaces, a trailing space, an `@mention`, and enough text to scroll — confirm the visible text tracks the caret exactly and nothing doubles.

## Technical notes

- No backend or data changes; the component's props, value handling and mention-suggestion logic stay as-is.
- The same component is used elsewhere (edit flows), so the fix applies everywhere the mention textarea appears.
