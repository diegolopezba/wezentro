
## Plan: Create Type Picker — Radial Bottom Sheet

### What the user wants
Instead of tapping + and going straight to the Create page, tapping + opens an **interactive semi-circle / radial picker** from the bottom. Two options fan out: **Post** and **Evento**. Tapping one navigates to `/create` with the type pre-selected. Tapping outside dismisses it.

### Approach

The + button in `BottomNav` will no longer navigate to `/create` directly. Instead it toggles a **radial picker overlay** that mounts on top of everything (portal-level, z-60). The overlay renders a translucent backdrop + two arc-fanned option buttons that animate up from the center `+` button position. Selecting one navigates to `/create?type=post` or `/create?type=event`.

The `Create` page already reads `contentType` state — we just need it to also accept a `?type=` query param to pre-select on mount.

---

### Visual design

```text
         ╭─────────────╮
         │  🎉 Evento   │   ← fans out top-left
         ╰─────────────╯

  ╭────────────╮
  │  ✨ Post   │             ← fans out top-right
  ╰────────────╯

       [ + ]                ← original button position (now × when open)
════════════════════════════
  ○  ○  [×]  ○  ○          ← bottom nav
```

Two pill buttons animate outward (translateX + translateY) from the center + button using `framer-motion` spring animations. Each card shows icon + label. Semi-transparent dark backdrop behind.

---

### Implementation

**1. `src/components/layout/BottomNav.tsx`**
- Remove direct navigation for the center `+` item
- Add `isPickerOpen` local state
- On `+` click: if guest → auth prompt as before. If logged in → toggle `isPickerOpen`
- When open: render the backdrop + two animated option buttons via `AnimatePresence`
- The + icon rotates 45° → × when open (standard mobile pattern)
- Backdrop click closes the picker
- Each option button: click → `navigate('/create?type=post')` or `navigate('/create?type=event')`

**2. `src/pages/Create.tsx`**
- Read `useSearchParams` on mount
- If `?type=post` or `?type=event` param exists → set `contentType` on initial state instead of defaulting to `"post"` always
- No other changes needed to Create page

---

### Animation spec (framer-motion)

```
Post button:   initial {x:0, y:0, opacity:0} → animate {x:-90, y:-80, opacity:1}
Evento button: initial {x:0, y:0, opacity:0} → animate {x:+90, y:-80, opacity:1}
Both use spring: stiffness 300, damping 22, delay 0.05s stagger
```

Backdrop: `opacity: 0 → 0.6`, `bg-black`, covers full screen below nav, `z-40`.

---

### Files changed

| File | Change |
|------|--------|
| `src/components/layout/BottomNav.tsx` | Intercept + tap → show radial picker overlay with 2 animated options |
| `src/pages/Create.tsx` | Read `?type=` query param to pre-select post/event on load |
