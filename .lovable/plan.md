

## Inconsistencies Found Between EventDetail.tsx and EventDetailOverlay.tsx

After reviewing both files and related components, here are the inconsistencies:

### 1. Post Detection Logic
- **EventDetail.tsx** (line 106): `isPost = event.is_post || !event.start_datetime` (fallback heuristic)
- **EventDetailOverlay.tsx**: Uses `event.is_post` directly everywhere (no fallback)
- **Fix**: Standardize on one approach in both files

### 2. Location Display for Posts
- **EventDetail.tsx** (line 284): Shows location for posts if `event.location_name` exists
- **Overlay** (line 253): Hides location entirely when `event.is_post` is true
- **Fix**: Align — likely show location if it exists regardless of type

### 3. Guestlist Section Visibility
- **EventDetail.tsx** (line 327): `!isPost && event.has_guestlist` — hidden for posts
- **Overlay** (line 307): `event.has_guestlist` — shown for posts too
- **Fix**: Both should hide guestlist for posts (`!isPost && event.has_guestlist`)

### 4. Invite Button (UserPlus) for Posts
- **EventDetail.tsx** (line 178): `!isPost && event.has_guestlist && canInviteToGuestlist`
- **Overlay** (line 191): `event.has_guestlist && canInviteToGuestlist` (no post check)
- **Fix**: Add `!event.is_post` guard in Overlay

### 5. Floating CTA Bar for Posts
- **EventDetail.tsx** (line 430): `!isPost && event.has_guestlist` — hidden for posts
- **Overlay** (line 405): `event.has_guestlist` — shown for posts too
- **Fix**: Add post check in Overlay

### 6. Reservation CTA Condition
- **EventDetail.tsx** (line 465): `(isPost || !event.has_guestlist)` — shows for posts
- **Overlay** (line 439): `!event.has_guestlist` — doesn't account for posts
- **Fix**: Align Overlay to match EventDetail's logic

### 7. DeleteEventDialog Not Post-Aware
- Always says "Eliminar evento" in title, description, and confirm button
- Should say "Eliminar post" when deleting a post (to match dropdown labels)
- **Fix**: Pass `isPost` prop to `DeleteEventDialog`

### 8. Category Badge Font Weight
- **EventDetail.tsx** (line 149): `font-medium`
- **Overlay** (line 161): `font-normal`
- **Fix**: Standardize to one

### 9. Guestlist Empty State Style
- **EventDetail.tsx** (line 364): Plain `<p>` text
- **Overlay** (line 347-352): Styled card with icon
- **Fix**: Use the nicer styled version in both

### 10. Joined Date Format
- **EventDetail.tsx** (line 358): `"MMM d"` (English-style)
- **Overlay** (line 338): `"d MMM"` (day-first)
- Neither uses `es` locale
- **Fix**: Standardize to `"d MMM"` with `{ locale: es }`

### Summary of Files to Change

| File | Changes |
|---|---|
| `EventDetailOverlay.tsx` | Add `isPost` variable, fix guestlist/CTA/invite guards, fix category font, fix date format |
| `EventDetail.tsx` | Fix empty state style, fix date format, fix category font |
| `DeleteEventDialog.tsx` | Add `isPost` prop, update title/description/button text |

