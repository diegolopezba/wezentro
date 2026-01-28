

# QR Payment Ticket System Implementation Plan

## Overview
Enable event organizers to optionally sell tickets through Zentro using QR code payments. The payment flow only activates when BOTH a price is set AND a payment QR is uploaded. Otherwise, price is displayed as information only.

---

## Payment Flow Logic

| Scenario | Price | QR Uploaded | Behavior |
|----------|-------|-------------|----------|
| Free event | 0 | No | Normal guestlist join |
| Display price only | > 0 | No | Show price, normal join |
| QR payment enabled | > 0 | Yes | Full QR payment flow |

---

## Database Changes

### Modify `events` table
| Column | Type | Description |
|--------|------|-------------|
| payment_qr_url | text | URL of payment QR image (nullable) |

### Modify `guestlist_entries` table
| Column | Type | Description |
|--------|------|-------------|
| payment_status | text | 'none', 'pending', 'confirmed', 'rejected' (default: 'none') |
| payment_confirmed_at | timestamptz | When organizer confirmed payment |

---

## User Flows

### Organizer Flow (Zentro Business Only)
```text
Create/Edit Event (must have Zentro Business)
    ↓
Enable Guestlist
    ↓
Set Price (optional, for display or payment)
    ↓
Want in-app payments? → Upload Payment QR
    ↓
Event Published
    ↓
If QR uploaded → Manage payments in Guestlist tab
```

### Attendee Flow - No QR (Price Display Only)
```text
User clicks "Unirse" on event with price but no QR
    ↓
Not Premium? → Premium Gate Modal → Subscription
    ↓
Is Premium? → Normal guestlist join (status: pending)
    ↓
Organizer approves → User on guestlist
```

### Attendee Flow - With QR Payment
```text
User clicks "Unirse" on event with price AND QR
    ↓
Not Premium? → Premium Gate Modal
   "Para unirte a listas y comprar entradas,
    necesitas Zentro Premium. ¡El primer mes es gratis!"
    ↓
Is Premium? → Payment QR Modal
   Step 1: Show blurred QR + price + "Ver QR de Pago"
    ↓
   Step 2: Unblur QR + instructions
   "Captura pantalla y paga desde tu banco"
    ↓
User clicks "Ya Pagué"
   → Create guestlist entry (status: pending, payment_status: pending)
   → Show confirmation: "Tu entrada aparecerá en Entradas"
    ↓
Organizer confirms payment → payment_status: confirmed
    ↓
Organizer approves guestlist → status: approved
    ↓
User can view entry QR at gate
```

---

## Implementation Phases

### Phase 1: Database Migration
- Add `payment_qr_url` to `events` table (nullable)
- Add `payment_status` to `guestlist_entries` (default: 'none')
- Add `payment_confirmed_at` to `guestlist_entries`

### Phase 2: Organizer QR Upload (Business Only)

**Files to modify:**
- `src/pages/Create.tsx` - Add optional QR upload section when price > 0
- `src/components/events/EditEventSheet.tsx` - Add QR upload/remove section
- `src/hooks/useEventMutations.ts` - Include payment_qr_url in update

**UI Behavior:**
- QR upload section appears only when price > 0 AND user has Zentro Business
- Label: "QR de Pago (opcional)" with helper text explaining it enables in-app payments
- If no QR: price shown as display only, normal join flow

### Phase 3: Premium Gate Modal

**Create:** `src/components/events/PremiumGateModal.tsx`
- Spanish copy explaining Zentro Premium benefits
- Highlights free trial
- Buttons: "Activar Prueba Gratis" / "Cancelar"

### Phase 4: Payment QR Modal

**Create:** `src/components/events/PaymentQRModal.tsx`
- Two-step flow: blurred → unblurred
- Shows event name and price
- Instructions for bank payment
- "Ya Pagué" button to submit

### Phase 5: Join Flow Integration

**Modify:** `src/pages/EventDetail.tsx`
```typescript
const handleJoinGuestlist = () => {
  if (!hasSubscription) {
    setShowPremiumGate(true);
    return;
  }
  
  // Only trigger payment flow if BOTH price > 0 AND QR exists
  if (event.price > 0 && event.payment_qr_url) {
    setShowPaymentModal(true);
    return;
  }
  
  // Normal join (free or display-only price)
  joinGuestlist();
};
```

**Modify:** `src/hooks/useGuestlist.ts`
- Add payment_status handling to join mutation
- Add `useConfirmPayment` and `useRejectPayment` mutations

### Phase 6: Organizer Payment Management

**Modify:** `src/components/events/GuestlistManagementSheet.tsx`
- Add "Pagos Pendientes" section (only shows if event has payment_qr_url)
- Filter users where payment_status = 'pending'
- "Confirmar Pago" / "Rechazar" buttons
- Success notification on confirmation

### Phase 7: Tickets Page Updates

**Modify:** `src/pages/Tickets.tsx`
- Show payment status badge:
  - "Pago Pendiente" (yellow) - waiting for organizer
  - "Pago Confirmado" (green) - can show entry QR
  - "Pago Rechazado" (red) - payment declined
- Gate entry QR until payment_status = 'confirmed'

**Modify:** `src/pages/YouAreGoing.tsx`
- Same payment status logic

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | Add payment fields |
| `PremiumGateModal.tsx` | Create | Premium explainer modal |
| `PaymentQRModal.tsx` | Create | QR payment flow modal |
| `Create.tsx` | Modify | Optional QR upload for Business |
| `EditEventSheet.tsx` | Modify | QR management for Business |
| `EventDetail.tsx` | Modify | Integrate payment flow |
| `useGuestlist.ts` | Modify | Payment mutations |
| `useEventMutations.ts` | Modify | Include payment_qr_url |
| `GuestlistManagementSheet.tsx` | Modify | Payment confirmation UI |
| `Tickets.tsx` | Modify | Payment status display |
| `YouAreGoing.tsx` | Modify | Gate QR on payment |

---

## UI Copy (Spanish)

**Premium Gate Modal:**
```
Title: "Únete a la Lista y Compra Entradas"
Body: "Para unirte a listas de eventos y comprar entradas, 
       necesitas ser suscriptor de Zentro Premium."
Highlight: "🎉 ¡Tu primer mes es GRATIS!"
CTA: "Activar Prueba Gratis"
Secondary: "Cancelar"
```

**Payment QR Modal - Step 1 (Blurred):**
```
Title: "{Event Name}"
Subtitle: "Precio: Bs {price}"
Body: "Para confirmar tu lugar, realiza el pago escaneando el QR"
Button: "Ver QR de Pago"
```

**Payment QR Modal - Step 2 (Unblurred):**
```
Instructions:
"1. Captura pantalla del QR
 2. Abre tu app de banco
 3. Escanea y paga Bs {price}"
Button: "Ya Pagué"
```

**After Payment Submitted:**
```
Title: "¡Pago Registrado!"
Body: "El organizador confirmará tu pago. 
       Esto puede tomar unos minutos o un par de horas."
Info: "Tu entrada aparecerá en la sección 'Entradas' de tu perfil."
Button: "Ver Entradas"
```

---

## Edge Cases

1. **Price = 0**: Skip payment flow, normal join
2. **Price > 0, no QR**: Show price as info, normal join (no payment tracking)
3. **Price > 0, has QR**: Full payment flow with confirmation
4. **User closes modal before "Ya Pagué"**: No entry created, can retry
5. **Organizer removes QR after users have pending payments**: Existing pending payments remain, can still be confirmed
6. **Non-Business user tries to add QR**: QR upload section not shown (gated by subscription check)

---

## Notifications

**To User:**
- "¡Pago confirmado! Tu entrada para {event} está lista"
- "Tu pago para {event} fue rechazado. Contacta al organizador."

**To Organizer:**
- "@username registró un pago para {event}" (shown in pending payments list)

