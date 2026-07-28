## Ticket page polish (`/going/:id`)

### 1. Floating top buttons over the cover
Move the back / info row out of the normal flow and absolutely position it over the image card (`absolute top-0 inset-x-0 z-20` inside a relative wrapper around Box 1), keeping `safe-top` padding. This pulls the whole card stack up so the cover photo starts higher on screen.

### 2. Branding graphic on the cover
Upload `mascot_zentro_on_disco_ball_white_graphic_transparent_background.png` to CDN storage as a project asset and place it bottom-center of the image box:
- Small pill/rounded container, `bg-black/40 backdrop-blur-md`, absolutely positioned `bottom-4 left-1/2 -translate-x-1/2`.
- Mascot rendered small (~28-32px tall) inside it. The uploaded file has black line art, so it will be rendered white (CSS `invert` filter or a white-rendered copy) so it reads on the dark blurred chip.

### 3. Third box → light theme with mascot + button
Rebuild Box 3 to match Box 2's cream card (`#F7F3E7`, dark text, rounded-3xl):
- Left: small mascot logo mark.
- Right: "Mostrar QR" pill button (dark on cream), flush right, opening the existing QR dialog.
- Layout `flex items-center justify-between` with comfortable padding.
- Pending / unavailable states keep their explanatory text inside the same light card (centered, dark muted text) instead of the button.

### Notes
- Presentation only; data fetching, `canViewQr` logic and the QR dialog stay unchanged.
- Files touched: `src/pages/YouAreGoing.tsx`, plus a new `src/assets/*.asset.json` pointer for the mascot.
