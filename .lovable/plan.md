
# Keep-Alive Page Caching Implementation

## Overview
Implement true keep-alive functionality using `keepalive-for-react` to cache the 4 core navigation pages. This preserves scroll position, component state, and eliminates loading flickers when users navigate back - achieving the Instagram/Pinterest experience.

## Technical Approach

### Library Choice: `keepalive-for-react`
- Modern library designed for React Router v6+
- Small bundle impact (~5-8KB gzipped)
- Built-in memory management with `max` limit
- Works with existing lazy loading and Suspense

### Architecture Change

```text
Current Flow:
User navigates away → Component unmounts → User returns → Component remounts → Data refetches → Loading shown

New Flow:
User navigates away → Component hidden (cached) → User returns → Component shown instantly
```

## Implementation Steps

### 1. Install Dependency
Add `keepalive-for-react` package to the project.

### 2. Create KeepAlive Layout Wrapper
Create a new layout component that wraps routes with the KeepAlive provider:

**File:** `src/components/layout/KeepAliveLayout.tsx`
- Uses `useLocation` and `useOutlet` from react-router-dom
- Configures KeepAlive with `max={4}` for memory control (one per cached page)
- Caches pages based on pathname

### 3. Update App.tsx Routing Structure
Restructure routes to use the KeepAlive layout for the 4 core navigation pages only:

**Cached pages (keep-alive enabled):**
- `/` (Index/Home)
- `/discover`
- `/chats`
- `/profile`

**Not cached (normal behavior):**
- `/saved` - Will remount normally
- `/auth` - Should clear on navigation
- `/create` - Fresh form state each time
- `/event/:id` - Dynamic content
- `/user/:id` - Dynamic content
- All other pages

### 4. Route Structure Change

```text
<Routes>
  {/* Keep-alive enabled routes */}
  <Route element={<KeepAliveLayout />}>
    <Route path="/" element={<Index />} />
    <Route path="/discover" element={<Discover />} />
    <Route path="/chats" element={<Chats />} />
    <Route path="/profile" element={<Profile />} />
  </Route>
  
  {/* Normal routes (no caching) */}
  <Route path="/saved" element={<Saved />} />
  <Route path="/create" element={<Create />} />
  {/* ... other routes ... */}
</Routes>
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `package.json` | Add `keepalive-for-react` dependency |
| `src/components/layout/KeepAliveLayout.tsx` | **New file** - KeepAlive wrapper component |
| `src/App.tsx` | Restructure routes to wrap only the 4 core pages with KeepAlive |

## Expected Results

| Scenario | Before | After |
|----------|--------|-------|
| Return to homepage from event detail | Loading skeleton, scroll at top | Instant, scroll preserved |
| Switch between bottom nav tabs | Brief flicker | Seamless transition |
| Memory usage | N/A | Controlled (max 4 pages cached) |
| Saved page behavior | N/A | Normal (remounts each time) |

## Risk Mitigation

- **Memory**: Limited to 4 cached pages (exactly the core nav pages)
- **Stale data**: React Query background refetch keeps data fresh
- **Animations**: May need minor Framer Motion adjustments if conflicts arise
