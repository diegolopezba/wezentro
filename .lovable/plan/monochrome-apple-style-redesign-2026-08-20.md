# Monochrome Apple-style redesign

Strip red out of the entire app, keep pages dark, keep content/action sheets light, and unify sheet corners at 24px.

## 1. Kill the red

Red currently lives in three places: the `--accent-red` / `--gradient-red` tokens, the `--destructive` token, and a handful of components that hardcode red-ish treatments.

- Repoint `--accent-red` to a neutral near-white (dark surfaces) so any leftover usage degrades gracefully instead of breaking.
- Replace `--gradient-red` with a subtle neutral gradient (white → light grey on dark, black → dark grey on light sheets).
- Make `--destructive` neutral: no red fills. Destructive actions get emphasis through weight, an outline, and confirmation copy instead of color.
- Sweep the components that reference red directly and convert them to semantic neutral tokens: `YouAreGoing`, `Auth`, `Onboarding`, `Create`, `Referrals`, `LocationSheet`, `LocationPicker`, `BusinessMiniMap`, `PushNotificationPrompt`, `GuestlistFunnel`, `button.tsx`, `useVenueLayouts`.
- The `.glow-border` magnetic ring on "Ver entrada" becomes a white/silver rotating ring instead of red.

## 2. Apple-flavored monochrome system

- Dark pages: layered greys instead of flat black — background, elevated card, and a subtle hairline border, so depth comes from luminance steps rather than color.
- Primary buttons: white pill with black text on dark; black pill with white text inside light sheets. Secondary: bordered/tinted grey.
- Selected states (category pills, tabs, filters) switch from red to filled white-on-black / black-on-white.
- Keep Poppins headings + Inter body; no font change.

## 3. Bottomsheet theming

- Content and action sheets stay/become light (`light-sheet`): payments, menus, reservations, pickers, forms, confirmations, info sheets, filters, followers, report.
- Immersive sheets stay dark: comments and share, which sit over media.
- Light sheets get a proper Apple treatment: white surface, grey hairline dividers, black primary pill, grey grabber.

## 4. Unify sheet corners

Every bottomsheet uses `rounded-t-3xl` (24px). This becomes the default baked into the shared sheet primitive so consumers don't have to repeat it, and the outliers get corrected — notably `drawer.tsx`, which currently uses a 10px radius.

## Technical notes

- Token changes in `src/index.css` (`:root`, `.light-sheet`) and `tailwind.config.ts`; the `accent-red` Tailwind color stays defined but neutral to avoid a mass rename.
- Sheet radius default lands in `src/components/ui/bottom-sheet.tsx` and `src/components/ui/drawer.tsx`; per-file `rounded-t-*` overrides that disagree are removed.
- `light-sheet` class is added to the sheets in the content/action list that don't already have it.
- No backend, data, or business-logic changes — presentation only.
