
## Audit: Inconsistencies & Simplification Opportunities

After a full read of all pages, routes, hooks, and layouts, here's a categorized list of everything worth cleaning up.

---

### 1. Duplicate Route — `/settings/notifications`

`App.tsx` has both `/notifications` and `/settings/notifications` pointing to the **exact same `Notifications` page**. Nothing in the app navigates to `/settings/notifications` — it's dead code. It should be removed.

---

### 2. Header Styling Inconsistency (3 different patterns across 15+ pages)

Pages use three different header backgrounds, with no consistent rule:

- `bg-background` — Settings, Profile, Index, Notifications
- `bg-background/80 backdrop-blur-xl border-b border-border` — BusinessSettings, BusinessPaymentSettings, BusinessDashboard
- `glass-strong safe-top` — Saved, Help, TermsOfUse, PrivacyPolicy, ChatDetail
- `bg-background/80 backdrop-blur-lg` — Create, Chats, JoinedEvents, EditProfile, MyReservations

All sub-pages should use the same standard. Suggestion: unify all secondary/sub-pages to `bg-background/80 backdrop-blur-lg` (or move the logic into `AppLayout` as a prop).

---

### 3. Back Button Style Inconsistency

Pages have three different back button implementations:

- `<Button variant="ghost" size="icon">` with `<ArrowLeft>` — most pages
- `<Button variant="ghost" size="icon">` with `<ChevronLeft>` — PrivacySettings, Notifications, Subscription
- Raw `<button>` with custom classes (no Button component) — MyReservations, Referrals

`MyReservations` uses a raw `<button>` without the `Button` component and without proper sizing classes. `Referrals` uses a custom rounded button style that differs from every other page. Both should use the standard `<Button variant="ghost" size="icon">`.

---

### 4. `JoinedEvents` Back Button Goes to `/settings` (hardcoded)

`JoinedEvents.tsx` line 38: `navigate("/settings")` instead of `navigate(-1)`. This is the only back button in the entire app that doesn't use `navigate(-1)`, meaning if you arrive at JoinedEvents from a deep link, the back button will skip to Settings rather than going back in history.

---

### 5. Duplicated `formatCount` Function

`formatCount` (K abbreviator for numbers) is copy-pasted identically in both `Profile.tsx` and `UserProfile.tsx`. It should live in `src/lib/utils.ts` and be imported in both.

---

### 6. Duplicated `renderTimelineCard` Function

`renderTimelineCard` is also copy-pasted identically in both `Profile.tsx` and `UserProfile.tsx`. Since both render a `<TimelineCard>` with the same props, it can be extracted to a shared helper or inline the `map()` directly without the wrapper function.

---

### 7. `Subscription` Page Wraps `AppLayout` Inside Itself Redundantly

`Subscription.tsx` renders `<AppLayout>` then immediately wraps children in `<div className="min-h-screen bg-background">`. The outer `AppLayout` already provides `min-h-screen bg-background`, creating a redundant nested div that duplicates the background class.

---

### 8. `EventDetailOverlay` and `EventDetail` — ~80% Logic Overlap

(Already tracked in architecture memory.) Both components independently maintain the same 10+ `useState` hooks, the same 15+ query hooks, identical action handlers (save, like, repost, join guestlist), and the same modal/sheet stack. This is the largest simplification opportunity in the codebase — extracting a `useEventDetailState(id)` hook would cut ~400 lines of duplication.

---

### 9. `YouAreGoing` QR Code Shows a Placeholder

The QR dialog renders a dashed box with just a `<QrCode>` icon and the first 8 characters of the token — not an actual scannable QR code. This is functionally broken. The token is present in the database but never rendered into a real QR code image. A library like `qrcode.react` should be added to generate the actual code.

---

### 10. `Tickets` Page Filters Past Events Client-Side

`Tickets.tsx` fetches all guestlist entries then filters out past events in JavaScript. This should be a server-side filter using `.gte("event.start_datetime", new Date().toISOString())` in the query, reducing unnecessary data transfer.

---

### Summary Table

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Dead route `/settings/notifications` | Low | Code cleanliness |
| 2 | 4 different header bg styles | Medium | Visual consistency |
| 3 | 3 different back button styles | Low | UX consistency |
| 4 | `JoinedEvents` hardcoded back to `/settings` | Trivial | Navigation bug |
| 5 | `formatCount` duplicated in 2 files | Low | DRY |
| 6 | `renderTimelineCard` duplicated in 2 files | Low | DRY |
| 7 | Redundant `min-h-screen` in Subscription | Trivial | Code cleanliness |
| 8 | EventDetail / EventDetailOverlay 80% overlap | High | Major DRY + maintainability |
| 9 | QR code is a placeholder, not real QR | Medium | Functional bug |
| 10 | Past-event filtering done client-side | Low | Performance |

---

### Recommended Plan

**Phase 1 — Quick wins (issues 1, 3, 4, 5, 6, 7, 10):** One pass of small, low-risk fixes across multiple files.

**Phase 2 — Header consistency (issue 2):** Standardize all sub-page headers to a single pattern; could be a `subPageHeader` variant in `AppLayout`.

**Phase 3 — Real QR code (issue 9):** Install `qrcode.react`, replace the placeholder in `YouAreGoing` with an actual QR render.

**Phase 4 — EventDetail refactor (issue 8):** Extract `useEventDetailState` shared hook — biggest win but highest risk; should be done in isolation.

Want me to implement all of these, or start with a specific phase?
