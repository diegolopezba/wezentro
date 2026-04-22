

# Plan: Update Terms of Use & Privacy Policy

Targeted edits to both legal documents — covering multi-tier tickets, payment/refund clarity for App Store review, and fixing existing bugs.

## Terms of Use (`src/pages/TermsOfUse.tsx`)

**Add new section after §6b (BNB Payments):** "Múltiples categorías de entradas (Tiers)"
- Organizers can define multiple ticket categories per event with distinct names, prices, and capacities
- Two sale modes: "todas a la vez" (all tiers visible at once) and "por orden" (sequential — next tier unlocks when previous sells out)
- Each tier is a separate ticket; access level and refund policy is per-tier
- Organizer is responsible for honoring the access level of each tier
- Once a tier sells out it becomes unavailable; Zentro does not maintain waitlists

**Add new section: "Política de reembolsos y cancelaciones"** (currently buried in §8 — Apple reviewers look for this explicitly)
- Event tickets via BNB: refunds handled directly by the organizing business; Zentro is not a party to the transaction
- Subscription payments via Stripe: no refunds for partial periods, cancel anytime
- App Store / Play Store IAPs: governed by Apple/Google policies
- If an event is cancelled by the organizer, the organizer is responsible for refunding ticket holders

**Fix bugs:**
- Two sections currently numbered "8" (Suscripciones, Programa de Referidos) → renumber and cascade the rest
- Update "Última actualización" to today's date
- §6 bullet "configuración correcta de precios" → expand to include "y categorías de entradas"
- §9 "Compras dentro de la Aplicación" → clarify this refers only to subscription IAPs, not BNB ticket purchases

## Privacy Policy (`src/pages/PrivacyPolicy.tsx`)

**Fix bugs:**
- Two sections numbered "6" ("Servicios de Terceros" and "Datos de Ubicación") → renumber Datos de Ubicación to §7 and cascade the rest
- §10 contact email says **"zentro@gmail.com"** — this is wrong, fix to **"hello@zentro.com"**
- Update "Última actualización" to today's date

**Content additions:**
- §2.1: add bullet "Categoría de entrada seleccionada al comprar tickets" so tier choice is transparently disclosed
- §8b: mention that for multi-tier events, the tier name (e.g. "VIP", "General") is stored alongside the ticket purchase record
- Retention period: leave generic ("durante el período requerido por la normativa fiscal aplicable") — not pinning a number per your instruction

## EULA version bump

In `src/components/moderation/EulaGate.tsx`, change recorded acceptance version from `"1.0"` → `"1.1"`. This re-prompts existing users to accept the updated terms on next app open — standard pattern Apple reviewers expect when material terms change.

## Files touched

- `src/pages/TermsOfUse.tsx`
- `src/pages/PrivacyPolicy.tsx`
- `src/components/moderation/EulaGate.tsx`

## Out of scope

- Waitlist policy language (feature not built)
- Refund automation (still manual organizer ↔ buyer per current architecture)
- English translation (Spanish-only for now)
- EULA gate copy itself (already compliant with Apple Guideline 1.2)

