# Fix: "Aceptar invitación especial" hidden on event pages (mobile)

## What is actually happening

The invite works. The data is correct: token `28bda2e0…` is pending and belongs to BRUNCH RAVE. The event page does render the "Aceptar invitación especial" button. I reproduced this on the preview and on zentro.today.

The problem is that **the app's bottom menu (Inicio, Mapa, +, Entradas, Perfil) sits on top of the event's bottom bar** on phone-sized screens. So the price and the "Aceptar invitación especial" button are there, but they're covered. In the test screenshot you can just make out "Desde Bs. 50" and "Aceptar invitación especial" behind the menu icons.

This isn't specific to invitations. Any event opened from a direct link on a phone (WhatsApp, email, a pasted URL) hides its bottom button the same way, including "Comprar". Events opened from inside the feed use a different overlay, so they aren't affected.

Why it started: in mid-September every normal app page was moved into a shared layout that always shows the bottom menu on mobile. The full event page ended up inside that layout, but it already has its own back button and bottom action bar. Both bars sit at the bottom of the screen, and the menu is layered above the event bar.

## Fix

1. Hide the mobile bottom menu on the full event page (`/event/:id`), the same way it's already hidden on dashboard and business settings pages. The desktop side rail stays as it is.
2. This brings back the event's own bottom bar for every case: "Aceptar invitación especial", "Comprar", "Ver entrada" + "Comprar", "Gestionar", and the reservation or experience bars on posts.

## Verification

- Open `/i/28bda2e0f875790cec39c9758fe62103` in a phone-sized browser:
  - signed out: "Aceptar invitación especial" is visible and tappable, and tapping it goes to login or signup, then back to the event.
  - signed in with a non-owner account: the button is visible and opens the accept flow.
- Open a normal event link (for example Cábala) on a phone-sized screen and confirm "Comprar" is visible.
- Confirm that events opened from the feed and on desktop look the same as before.

## Technical details

- Cause: in `src/App.tsx`, `/event/:id` is inside `MainAppLayout`, which renders `BottomNav` (`fixed bottom-0 z-40`). The EventDetail floating CTA is `fixed bottom-0 z-30`, so the nav covers it on screens below `lg`.
- Change: wrap the route in the existing `HideMobileNav` helper:
  `<Route path="/event/:id" element={<HideMobileNav><LazyRoute><EventDetail /></LazyRoute></HideMobileNav>} />`
- No backend or invite-logic changes are needed.
