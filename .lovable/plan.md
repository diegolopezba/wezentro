
## Complete QR Scanner System — Full Review & Implementation Plan

### What exists today
- `guestlist_entries` has `qr_code_token` (auto-generated UUID), `checked_in_at`, `attended` — all already in schema
- `YouAreGoing.tsx` renders a real `QRCodeSVG` using the token — ✅ works
- `qrcode.react` is installed — ✅
- No `check-in-guest` edge function — ❌ not built
- No `scanner_access_token` column on `events` — ❌ not built
- No scanner UI page — ❌ not built
- No "share scanner" button anywhere — ❌ not built
- No QR decode library installed (`jsQR`, `html5-qrcode`) — ❌ need to add

---

### Security model (finalized)

**Token on `events.scanner_access_token`** — a UUID generated per event, stored in the DB. This is the "bouncer key". 

**Edge function `check-in-guest`** accepts two auth modes:
1. **Owner mode**: `Authorization: Bearer <user_jwt>` — validates the caller is the event's `creator_id`
2. **Bouncer mode**: `x-scanner-key: <token>` — validates against `events.scanner_access_token`

Both modes call the same validation:
- Token exists in `guestlist_entries`, matches `event_id`
- Entry `status = 'approved'`
- `checked_in_at IS NULL` (single-use enforcement)
- Sets `checked_in_at = now()`, `attended = true`
- Returns guest's `username`, `full_name`, `avatar_url`

**What the bouncer page shows:** Only the camera, event name, and scan result. No dashboard, no financial data, no other events. The URL contains the event ID + scanner token as a query param, so it's self-contained and shareable via WhatsApp.

**Token rotation:** Owner can regenerate the token from `GuestlistManagementSheet`, instantly revoking any shared links.

---

### Changes required

**1. Database migration**
Add column to `events`:
```sql
ALTER TABLE public.events 
ADD COLUMN scanner_access_token uuid DEFAULT gen_random_uuid();
```
No RLS needed — the column is only read server-side in the edge function via service role.

**2. Edge function: `supabase/functions/check-in-guest/index.ts`** (new)
- `verify_jwt = false` in `config.toml`
- Accepts `{ qr_code_token, event_id }`
- Auth: checks `Authorization` header (JWT) OR `x-scanner-key` header
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (needed so bouncer with no account can update)
- Validates entry and updates atomically
- Returns `{ success, alreadyUsed, guest: { username, full_name, avatar_url } }`

**3. New page: `src/pages/ScanQR.tsx`**
- Route: `/scan/:eventId` — **no auth wrapper** (publicly accessible)
- Reads `?key=<scanner_access_token>` from URL
- Validates key is present (shows "Acceso inválido" if missing)
- Uses `jsQR` library (lightweight, no external service needed) with `getUserMedia` canvas loop
- States: `idle → scanning → loading → success (green) → already_used (red) → error`
- Displays event name, scan result overlay with guest avatar + name
- "Escanear siguiente" resets after 3 seconds or on tap

**4. Install `jsqr`**
- Add to `package.json` dependencies — lightweight (6kb), no dependencies, works in browser canvas

**5. `supabase/config.toml`** — add:
```toml
[functions.check-in-guest]
verify_jwt = false
```

**6. `src/App.tsx`** — add lazy route:
```tsx
const ScanQR = lazy(() => import("./pages/ScanQR"));
// Route: /scan/:eventId — no ProtectedRoute
```

**7. `src/components/events/GuestlistManagementSheet.tsx`** — add "Escanear Entradas" button
- Visible to event creator only (already the only user who opens this sheet)
- Copies shareable URL to clipboard: `[appUrl]/scan/[eventId]?key=[scannerToken]`
- Shows "Regenerar" to rotate the token (calls an edge function or direct DB update via owner JWT)
- Token is fetched from the `events` table alongside event data

**8. Hook: fetch `scanner_access_token` for the event**
- Small query inside `GuestlistManagementSheet` (or new `useScannerToken` hook) that fetches the token only for the event creator, using the existing `events` RLS (`creator_id = auth.uid()`)

---

### Files to create/edit

| File | Action |
|------|--------|
| Migration | Add `scanner_access_token` to `events` |
| `supabase/functions/check-in-guest/index.ts` | Create |
| `supabase/config.toml` | Add function entry |
| `src/pages/ScanQR.tsx` | Create |
| `src/App.tsx` | Add lazy import + public route |
| `src/components/events/GuestlistManagementSheet.tsx` | Add "Escanear" button + share modal |
| `package.json` | Add `jsqr` dependency |

---

### QR data format (what the guest's QR encodes)
Currently `YouAreGoing.tsx` encodes just the raw `qr_code_token` UUID string. This is correct — the edge function looks up that token in `guestlist_entries`. No change needed here.

---

### Single-use enforcement detail
The update is done with a conditional filter:
```sql
UPDATE guestlist_entries 
SET checked_in_at = now(), attended = true 
WHERE qr_code_token = $1 
  AND event_id = $2 
  AND checked_in_at IS NULL  -- atomic single-use guard
RETURNING *
```
If 0 rows are returned → already checked in. This is race-condition safe at the DB level.
