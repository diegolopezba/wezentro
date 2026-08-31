# Zentro Admin Panel

A private admin console for you only, reachable at its own subdomain (e.g. `admin.zentro.today`), with a standalone admin-only login. First version focuses on **Analytics overview** and **Payments & finance**.

## How access works

- Admin rights live in the existing `user_roles` table (`role = 'admin'`). Right now there are zero admin rows — your account gets the first one.
- `/admin/login` is a dedicated login screen: email + password. After sign-in, the app checks the admin role server-side. If the account is not an admin, it is signed out immediately and shown "Acceso denegado" — no hint that the panel exists.
- Every admin route is wrapped in an admin guard. Non-admins hitting any `/admin/*` URL directly get bounced to `/admin/login`.
- The panel is never linked from anywhere in the normal app, and the normal app never renders admin UI.

## Where it lives

Same project and same deploy, served under `/admin/*`. You then connect `admin.zentro.today` in Project settings → Domains and it lands on the admin login. Nothing else in the app changes, and there is no second codebase to keep in sync.

## Screens (v1)

**1. Overview (analytics)**
- Users total + new signups (today / 7d / 30d), business accounts count, active businesses.
- Content: events, posts and experiences created per period.
- Engagement: likes, comments, saves, reservations, bookings per period.
- Gross sales volume and Zentro commission earned, with a simple trend chart.

**2. Payments & finance**
- Zentro revenue: total commission earned (6%), by period, split by tickets vs experiences.
- Gross volume processed, organizer payouts, average order value, quantity of tickets sold.
- Transaction table: all `payment_sessions` (buyer, business, event, amount, fee, payout, status, date) with filters by status, date range and business, plus search.
- Failure watch: pending / failed sessions older than 30 minutes, so you can spot stuck checkouts.
- Top businesses by volume and by commission generated.
- CSV export of the filtered transaction list.

**3. Businesses (light, supporting the finance view)**
- List of business accounts with subscription tier, payout-setup status (has a Qhantuy beneficiary or not), sales to date.
- Read-only detail drawer; account edits (suspend, toggle business, moderation) come in a later pass unless you want them now.

## Technical notes

- **Data access:** one new edge function `admin-api` holds all admin queries. It verifies the caller's JWT, confirms `has_role(uid, 'admin')`, and only then uses the service role to read across tables. This means no RLS policy anywhere gets loosened — regular users cannot reach admin data even if they guess the endpoint.
- **Role bootstrap:** a migration is not used for granting the role; your `user_roles` admin row is inserted as a one-off data change once you confirm which account should be the admin.
- **Aggregation:** heavy counts run as SQL aggregate functions (security definer, admin-checked) rather than pulling rows into the browser, so the panel stays fast as data grows.
- **Fees:** figures reuse `platform_fee_amount` / `payout_amount` already stored on `payment_sessions`, falling back to `src/lib/platformFee.ts` (600 bps) for older rows.
- **UI:** desktop-first admin layout (sidebar + data tables), dark theme, reusing existing design tokens. Kept out of the mobile app shell — no bottom nav, no keep-alive layout.
- **Routes:** `/admin/login`, `/admin` (overview), `/admin/payments`, `/admin/businesses`, all lazy-loaded so they add nothing to the normal app's bundle.

## What I need from you

- Which account email should be the admin (I can use your current one).
- After the build, connect `admin.zentro.today` in Project settings → Domains.
