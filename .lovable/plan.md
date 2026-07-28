## Ticket page redesign (`/going/:id`)

Rebuild the ticket screen as three stacked cards on a dark background, DICE-inspired but in Zentro's style (pill buttons, brand red accent, Poppins, Bs. currency conventions).

```text
┌───────────────────────────────┐
│ [<]                      [i]  │  floating over image
│ ┌───────────────────────────┐ │
│ │   BOX 1 — event image     │ │  first media item (image, or
│ │   (4:5 rounded card)      │ │  poster frame if it's a video)
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ BOX 2 — details (light)   │ │
│ │  Event title (small caps) │ │
│ │  BUYER NAME (big, bold)   │ │
│ │  Fri, 24 Oct · 22:00      │ │
│ └───────────────────────────┘ │
│ ┌───────────────────────────┐ │
│ │ BOX 3 — [ Mostrar QR ]    │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

### Box behaviour
1. **Image box** — first item of the event's media (carousel-aware); falls back to `image_url`, then placeholder. Rounded-3xl, object-cover.
2. **Details box** — light cream/white card: event title on top (small, muted), buyer's full name in the middle in large bold text, date/time below. Location stays as a subtle line under the date so nothing is lost.
3. **Action box** — full-width pill "Mostrar QR" button opening the existing QR dialog. If the ticket isn't viewable yet (payment pending / request pending), this box shows the existing explanatory message instead of the button.

### Top corners
- Left: back button (guarded `navigate(-1)` → `/` fallback), circular translucent.
- Right: new `i` info button opening a **light-theme bottom sheet** with a friendly message encouraging the user to post the ticket to their Instagram story so friends can join — short warm copy in Spanish, a small illustration/emoji, and a "Entendido" pill button to dismiss.

### Technical notes
- Edit `src/pages/YouAreGoing.tsx`; extract the new info sheet as `src/components/events/TicketInfoSheet.tsx` using the same `light-sheet` pattern as the payment/menu/reservation sheets.
- Data fetching, `canViewQr` logic, and the QR dialog stay exactly as-is — this is presentation only.
- Layout scrolls safely on small screens with `safe-top`/`safe-bottom` padding.
