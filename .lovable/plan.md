## Goal

Replace the brief black-screen + spinner that flashes when the four core tabs (Home, Discover, Chats, Profile) lazy-load for the first time, with a route-aware skeleton that already shows the page chrome (bottom nav + header + content placeholders). Matches Instagram/Pinterest/TikTok behavior.

## Why it happens today

- `src/App.tsx` lazy-loads every page, including the four core routes.
- `KeepAliveLayout` wraps the outlet in `<Suspense fallback={<PageLoader />}>`.
- `PageLoader` paints a full-viewport `bg-background` div with a delayed spinner. Since each page provides its own `AppLayout` (which contains `BottomNav`), during the lazy-import window there is no `BottomNav`, no header — just a solid dark fill that reads as a black flash.

## Approach

Per-route skeleton fallbacks rendered inside `AppLayout` so `BottomNav` stays visible with the correct active tab. Skeletons match the shape of the destination page so layout doesn't jump when real content arrives.

### 1. New file: `src/components/skeletons/RouteSkeleton.tsx`

A small dispatcher used as the Suspense fallback inside `KeepAliveLayout`:

- Reads `useLocation().pathname`.
- Renders one of: `HomeRouteSkeleton`, `DiscoverRouteSkeleton`, `ChatsRouteSkeleton`, `ProfileRouteSkeleton`.
- Each variant wraps content in `<AppLayout>` so `BottomNav` is present immediately with the correct active tab highlighted.
- Composes existing primitives from `src/components/skeletons/index.tsx` (`EventFeedSkeleton`, `ChatListSkeleton`, `ProfileSkeleton`) plus a small per-page header placeholder (logo bar for Home, search pill for Discover, "Chats" title for Chats, avatar/stats row for Profile).
- Shell renders immediately; inner skeleton blocks fade in after a 150ms delay (same trick `PageLoader` already uses) so instant chunk hits don't flash a skeleton.

### 2. Wire it into `KeepAliveLayout`

In `src/components/layout/KeepAliveLayout.tsx`, swap the Suspense fallback to `<RouteSkeleton />`. Single-line change.

### 3. Keep `PageLoader` for everything else

Secondary pages (Settings, EventDetail, EditProfile, etc.) keep their existing `<Suspense fallback={<PageLoader />}>`. Scope is strictly the four core tabs.

### 4. Verify

- Cold-load PWA, tap Profile/Chats/Discover/Home for the first time — bottom nav stays put, skeleton appears in content area, no black flash.
- Confirm `KeepAlive` cache still kicks in on subsequent visits (instant, no skeleton).

## Out of scope

- No changes to data fetching, `PageLoader`, secondary-route fallbacks, or splash screen.
