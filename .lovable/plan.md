# Bring back red in two spots + smart save buttons

## 1. Red only where it means something

Add a dedicated `--brand-red` token (Pinterest red) that is separate from the neutralized `--accent-red` / `--destructive` tokens, so red can never leak back into buttons, gradients or dashboards.

Red is used in exactly two places:

- **Like heart** — filled red when liked, on the feed card heart (`CardLikeButton`), the event detail / detail modal heart, and the comment heart. Unliked state stays neutral (white outline on media, muted grey in comments).
- **Notification dot** — the unread indicator on the home header bell becomes red instead of the neutral `bg-destructive`.

Everything else stays monochrome.

## 2. Save button reflects unsaved changes

Right now save buttons in sheets sit in the neutral grey `default` style at all times, so it isn't clear when there is something to save.

New behavior in edit sheets:

- No changes yet: grey/muted button, disabled.
- Once any field is edited: button switches to solid black-on-white (inside light sheets) / white-on-black (dark sheets) and becomes enabled.
- While saving: same emphasized style with the spinner.

Applied to the edit sheets that have a Guardar action: Editar evento, Editar menú / Menu editor, Promociones, Horario de reservas, Reglas de reservas, and the profile/business info save actions.

## Technical notes

- New `--brand-red` (and `--brand-red-foreground`) in `src/index.css` `:root`, mirrored in `.light-sheet`, plus a `brand-red` color in `tailwind.config.ts`. `--accent-red` and `--destructive` stay neutral.
- Heart components switch their liked state to `fill-brand-red text-brand-red`; `src/pages/Index.tsx:240` dot switches to `bg-brand-red`.
- Dirty tracking: each sheet snapshots its initial form values when it opens and compares with the current state (shallow compare of the form object); the derived `isDirty` drives a `variant`/class swap on the save `Button` plus `disabled={!isDirty || isPending}`.
- Presentation and local form state only — no backend, schema, or mutation changes.
