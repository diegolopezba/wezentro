# Uniform settings list UI

Make the settings screens look like the reference: one calm, uniform list of rows instead of colored icon tiles and mixed card styles.

## What changes

**Settings page (`/settings`)**
- Add a profile row at the top of the first card: avatar, display name, username underneath, chevron on the right. Tapping it goes to Edit Profile.
- All rows share one look: plain outline icon (no colored/tinted square behind it), label, optional sublabel, chevron. Same height, same padding, same divider.
- Icons all use the same muted foreground color — no per-item highlight color. The "Business" and "Dashboard" rows lose their red/primary tint and sit in the list like everything else.
- Keep the existing grouping (Personal / Business / Soporte) but with lighter, smaller section labels — or no label at all where a group is self-evident. Sign out stays in its own card at the bottom, destructive red kept.
- The "¿Tenés un local?" promo card stays as-is above the list.

**Business settings page (`/settings/business`)**
- Same treatment: rows become uniform (no blue/orange/green/purple icon tiles), same row height and divider style, grouped in rounded cards like the main settings page.
- The "Cuenta Business" toggle row and the setup checklist keep their current behavior, restyled to match the uniform row (toggle on the right, plain icon on the left).

Nothing about navigation, data, or behavior changes — only presentation.

## Technical notes

- Extract a shared `SettingsRow` component (icon, label, sublabel, right slot for chevron/switch, onClick) plus a `SettingsGroup` wrapper (`rounded-2xl bg-card border border-border divide-y divide-border`) under `src/components/settings/`.
- Use semantic tokens only (`text-muted-foreground`, `bg-card`, `border-border`, `text-destructive`); remove hardcoded `text-blue-500`, `bg-orange-500/15`, etc.
- Reuse the existing avatar helper for the profile row; pull name/username/avatar from `useAuth().profile`.
- `src/pages/Settings.tsx` and `src/pages/BusinessSettings.tsx` are rewritten to compose the shared row/group components; keep current `framer-motion` entry animations.
