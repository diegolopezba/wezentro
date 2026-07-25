## Phase 1: Light-theme bottomsheets for Payments, Menu & Reservations

Switch every bottomsheet tied to the payment system, menu, and reservations flows from the app-wide dark theme to a light theme, while keeping the rest of the app dark.

### Approach

Add a reusable `light-sheet` styling scope (applied via a className on `SheetContent`) that overrides the semantic tokens to their light equivalents inside that sheet only. This keeps all children (buttons, inputs, cards, text, borders, muted text, avatars, skeletons) automatically light without touching each child component.

- Define `.light-sheet` in `src/index.css` that re-declares the semantic HSL tokens (`--background`, `--foreground`, `--card`, `--popover`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--secondary`, `--secondary-foreground`, `--accent`, `--ring`) to their light-mode values. Keep `--primary` = Pinterest red so brand CTAs remain consistent.
- Nested sheets/popovers/dropdowns that portal outside the sheet DOM will get the class passed through explicitly where needed.

### Sheets to convert

Payments
- `src/components/events/PaymentQRModal.tsx` (checkout: details → QR → success)
- `src/components/events/BeneficiaryRequiredSheet.tsx`
- `src/components/events/BusinessRequiredSheet.tsx`
- `src/components/events/PaymentsComingSoonSheet.tsx`

Menu
- `src/components/menu/MenuSheet.tsx` (public menu viewer)
- `src/components/menu/EditMenuSheet.tsx` (business editor sheet)

Reservations
- `src/components/reservations/ReservationSheet.tsx` (user reservation flow)
- `src/components/reservations/ReservationsManagementSheet.tsx` (owner management)

Each of these gets `className="light-sheet ..."` on the `SheetContent` / `DialogContent` root and any hardcoded dark-only utility classes (e.g. `bg-background/80` where it visually reads as dark) audited to use the semantic tokens so the scope override takes effect.

### Out of scope
- Guestlist, event actions, comments, share, filters, invites, and all other sheets remain dark.
- No changes to global dark theme or brand color.
- No logic changes — visual only.

### Verification
- Open each listed sheet in preview and confirm light background, readable foreground, correct muted/border tones, and that the primary red CTA still pops.
- Confirm neighboring dark sheets are unaffected.
