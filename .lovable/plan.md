## Quick fix: Disable paid tickets, show explainer bottomsheet

**Goal:** For the first 2 weeks (until the new payment system ships), users cannot set a price on event tickets. When they try, a friendly Spanish bottomsheet explains why and tells them they can still publish free events.

### Scope
Frontend only. No DB changes, no backend changes. BNB QR flow is left in code untouched (just not reachable since no paid events can be created).

### Changes

**1. New component** `src/components/events/PaymentsComingSoonSheet.tsx`
- shadcn `Sheet` with `side="bottom"`, rounded top, brand-red accent.
- Copy (Spanish):
  - Title: "Pagos disponibles muy pronto"
  - Body: "Estamos puliendo el sistema de pagos para que vender entradas sea súper fácil y seguro. Estará disponible en aproximadamente 2 semanas. Mientras tanto, podés publicar tu evento como gratis (sin entradas) y empezar a generar comunidad desde ya."
  - Single CTA pill button: "Entendido"
- Controlled via `open` / `onOpenChange` props.

**2. `src/pages/Create.tsx`**
- Add `const [showPaymentsSoon, setShowPaymentsSoon] = useState(false);`
- On the single-price `<Input type="number">` (line ~729):
  - Set `readOnly`, `value=""`, `placeholder="Gratis — pagos disponibles pronto"`.
  - `onFocus` and `onClick` → `setShowPaymentsSoon(true)` and blur.
- Force `formData.price = ""` on submit (already treated as 0 / Gratis downstream).
- Render `<PaymentsComingSoonSheet open={showPaymentsSoon} onOpenChange={setShowPaymentsSoon} />`.

**3. `src/components/events/TicketTiersEditor.tsx`**
- Add optional `onAttemptPaidAction?: () => void` prop.
- Hide / disable the "tiers" mode toggle button (only "single" / Gratis available for now). Tapping it triggers `onAttemptPaidAction`.
- Disable the per-tier price input the same way as single price.
- In `Create.tsx`, pass `onAttemptPaidAction={() => setShowPaymentsSoon(true)}`.

**4. Submit guard in `Create.tsx`**
- If somehow `insertPrice > 0` or `cleanTiers.length > 0`, abort and open the sheet instead of inserting. Defensive only.

### Out of scope
- Removing BNB code, edge functions, payment_config table, or existing paid events already in DB.
- Buyer-side ticket purchase UI (no new events will have prices, so it won't trigger).
- Any backend/RLS change.

### Verification
- Open Create → toggle to Event → tap price field → bottomsheet appears, field stays empty.
- Tap "Tiers" mode → bottomsheet appears, mode does not switch.
- Submit a free event → publishes normally with `price = 0` (shows as "Gratis" in feed).
