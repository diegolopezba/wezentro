## Goal

Make the menu icon button on user profiles look identical to the menu icon shown inside the MenuSheet header (solid brand red circle, white icon).

## Current state

- **MenuSheet header** (`src/components/menu/MenuSheet.tsx:82-83`): solid filled circle — `bg-destructive` with white `UtensilsCrossed` icon. This is the look the user likes.
- **UserProfile menu button** (`src/pages/UserProfile.tsx`, in the food-business actions row): tinted/outline style — `variant="secondary"` with `bg-destructive/15 border-destructive/30` and `text-destructive` icon. This is the one that should change.

## Change

In `src/pages/UserProfile.tsx`, update the menu icon `Button` so it visually matches the sheet:

- Use a solid `bg-destructive` background (keep `size="icon"` and `shrink-0` for layout)
- Use `text-white` (or `text-destructive-foreground`) on the `UtensilsCrossed` icon
- Remove the `/15` tint and `/30` border classes
- Preserve the existing `onClick`, `active:` feedback, and surrounding flex layout — no behavior changes

No other files change. The own-profile "Editar Menú" button in `Profile.tsx` is a labeled outline button in a different context and is out of scope unless you want it included.
