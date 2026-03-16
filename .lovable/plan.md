
## Research Findings: How PedidosYa Does It & What BNB Offers

### What PedidosYa actually does in Bolivia

The news article confirms PedidosYa **launched QR payments in Bolivia recently (Dec 2024)**, positioning Bolivia as the FIRST country in their Latin American network to get this feature. The description matches exactly what you want:

> "usuarios de PedidosYa podrán completar sus pedidos de manera fluida y segura, simplemente escaneando el código QR desde su **aplicación bancaria o billetera digital preferida**"

This is the same interoperable Bolivian QR standard. The user receives a QR inside the app, switches to their banking app (any Bolivian bank), scans and pays, then comes back to the app.

**How they likely built it:** Based on the research, PedidosYa most likely uses **LocalPayment** (code `1150` for Bolivia QR) since LocalPayment is the most documented third-party aggregator with a full Bolivia QR API, webhooks, and a merchant dashboard. LocalPayment handles the QR generation and routes the payment notification back via webhook.

---

### The BNB API: What it actually does vs. LocalPayment

After reading the full BNB Open Banking sandbox docs, here is a clear comparison:

**BNB Open Banking (`/main/getQRWithImageAsync`):**
- Generates a dynamic QR → returns it as a **byte array (image)**
- Has a status poll endpoint `/main/getQRStatusAsync` → returns `1=No Usado, 2=Usado, 3=Expirado, 4=Con error`
- **NO webhook push** — must poll
- Auth: `accountId` + `authorizationId` → JWT token
- Sandbox URI: `https://qrsimpleapiv2.azurewebsites.net/api/v1/`
- Payment goes **directly into the BNB business account** — no intermediary

**LocalPayment (`/api/payin/` with code `1150`):**
- Also generates a Bolivia interoperable QR
- Has **real webhook push** (asynchronous notification) when payment is confirmed
- Payment goes into **LocalPayment's collected balance**, then Zentro (or business) has to do payouts
- Requires merchant onboarding with LocalPayment (KYC, business registration)
- Code is `1150`, currency `BOB`, country `BOL`

---

### The key insight for Zentro

**BNB is actually the BETTER option for Zentro's use case**, for these reasons:

1. **Money goes directly to the business's BNB account** — Zentro never touches the money. Zero liability.
2. **Businesses likely already have BNB accounts** (you said most businesses use BNB).
3. **No third-party intermediary fees** from LocalPayment.
4. **The QR is the standard Bolivian interoperable QR** — scannable by ANY banking app in Bolivia (not just BNB). This is the same standard used by all banks in the country.
5. The only tradeoff vs LocalPayment: **no webhook push, must poll** — but this is easy to handle.

**The "Open Banking registration" question:** Looking at the BNB docs, to get `accountId` and `authorizationId`, a business needs to register at `bnb.com.bo/PortalBNB/Api/OpenBanking`. This is a separate registration from just having a BNB bank account, BUT it is designed for businesses to self-register — it's BNB's developer portal, not an institutional BCB approval process. It's more like registering for an API key with your bank.

---

### Confirmed: The exact same flow as PedidosYa

```
1. Business registers for BNB Open Banking → gets accountId + authorizationId
2. Business pastes credentials into Zentro BusinessSettings ("Pagos BNB" section)
3. User taps "Comprar" on a paid event in Zentro
4. Zentro edge function → calls BNB /auth/token → gets JWT
5. Zentro edge function → calls BNB /main/getQRWithImageAsync
   → sends: currency=BOB, amount=event.price, gloss=event.title, singleUse=true
   → receives: QR image as byte array + qrId
6. PaymentQRModal shows the REAL dynamic QR image (base64)
7. User screenshots or directly opens banking app, scans the QR
8. User pays from their banking app (any Bolivian bank)
9. Zentro polls BNB /main/getQRStatusAsync with qrId every 4 seconds
10. When status = 2 (Usado) → auto-approve guestlist entry → issue ticket
11. Modal auto-advances to success — NO "Ya Pagué" button needed
12. Push notification sent to user: "¡Tu entrada fue confirmada!"
```

---

### What the plan builds

**Database migrations (2):**
1. `business_payment_settings` table — stores per-business BNB credentials (`bnb_account_id`, `bnb_authorization_id`) with RLS (only owner can read)
2. `payment_sessions` table — tracks each QR payment attempt (`event_id`, `buyer_user_id`, `bnb_qr_id`, `amount`, `status: pending/confirmed/expired`)

**Edge functions (2):**
1. `generate-bnb-qr` — authenticates with BNB, generates QR, stores session, returns base64 image + sessionId
2. `check-bnb-payment-status` — polls BNB status, on `Usado` auto-approves the guestlist entry + issues ticket

**Frontend changes (3):**
1. `BusinessSettings.tsx` — new "Pagos BNB" section with accountId + authorizationId fields; shows "Conectado ✓" badge when saved
2. `PaymentQRModal.tsx` — complete rework: calls `generate-bnb-qr` on open, shows real QR image, polls `check-bnb-payment-status` every 4s, auto-advances to success — removes the "Ya Pagué" button entirely
3. `EventDetailOverlay.tsx` or wherever the modal is triggered — update props (no more static `paymentQrUrl`, now just `eventId`)

**Fallback:** Events that still have a `payment_qr_url` manually uploaded (old system) continue to work as before with the manual "Ya Pagué" confirmation — zero breaking change for existing events.

### Files to create/edit

| File | Action |
|---|---|
| New migration #1 | `business_payment_settings` table |
| New migration #2 | `payment_sessions` table |
| `supabase/functions/generate-bnb-qr/index.ts` | New edge function |
| `supabase/functions/check-bnb-payment-status/index.ts` | New edge function |
| `src/pages/BusinessSettings.tsx` | Add BNB credentials section |
| `src/components/events/PaymentQRModal.tsx` | Dynamic QR + auto-polling |
| `src/components/events/EventDetailOverlay.tsx` | Update modal props |
| `supabase/config.toml` | Register 2 new edge functions |
