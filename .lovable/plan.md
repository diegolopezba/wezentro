
Yes — and looking at the actual code, it's even simpler than the previous plan described. Here's exactly what needs to change:

**The real scope (3 small edits):**

### 1. `src/index.css` — one line addition in the `*` block
```css
* {
  @apply border-border;
  -webkit-tap-highlight-color: transparent;
}
```
This kills the browser tap flash globally on every element — buttons, links, cards, everything — in one shot. No need for `@media (hover: none)` overrides or `!important` hacks.

### 2. `src/components/ui/button.tsx` — strip hover classes, clean up base
Base class: remove `transition-all duration-200`, add `select-none [-webkit-tap-highlight-color:transparent]` (belt-and-suspenders for the button specifically).

Strip from variants:
- `default`: remove `hover:bg-secondary/80`
- `destructive`: remove `hover:bg-destructive/90`
- `outline`: remove `hover:bg-accent hover:text-accent-foreground`
- `secondary`: remove `hover:bg-secondary/80`
- `ghost`: remove `hover:bg-accent hover:text-accent-foreground`
- `link`: remove `hover:underline`
- `glass`: remove `hover:bg-white/10`
- `hero`: remove `hover:opacity-90 hover:scale-[1.02]` — keep `active:scale-[0.98]`
- `premium`: remove `hover:from-amber-400 hover:to-orange-400`

### 3. `src/components/layout/BottomNav.tsx` — two raw `<button>` elements
Remove `hover:bg-secondary/80` from the "Post" and "Evento" picker buttons (lines 54 and 60). These are raw HTML buttons that bypass the `Button` component.

---

That's it. 3 files, minimal changes. The global tap highlight line in CSS does the heavy lifting for the rest of the app (cards, list items, nav links, etc.) without needing to touch every component.
