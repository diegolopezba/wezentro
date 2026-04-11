

## PWA Crash Fixes — 3 Changes

### 1. Error Boundary (`src/components/ErrorBoundary.tsx` — new file)
Create a React class component error boundary with:
- `componentDidCatch` to log the error
- A fallback UI showing "Something went wrong" with a "Reload" button
- Wrap the main app content in `App.tsx` with this boundary

### 2. Service Worker NetworkFirst for Navigation (`public/sw.js`)
Update the fetch handler to detect navigation requests (`event.request.mode === 'navigate'`) and use network-first strategy:
- Try network first for HTML pages
- Fall back to cached `/index.html` only if offline
- Keep existing cache-first for hashed static assets (JS/CSS)
- Keep existing bypass patterns for APIs

### 3. MapView Memory Leak Fix (`src/components/map/MapView.tsx`)
- Add a `foodRootsRef` to track React roots created via `createRoot()` for food markers and popups
- In `clearFoodMarkers()`, call `root.unmount()` on every tracked root before removing markers
- Clean up popup roots when replacing popups

### 4. Lazy Import Recovery (`src/App.tsx`)
Add a wrapper around lazy imports that catches chunk-load failures and triggers a one-time page reload (same pattern used by Next.js/CRA):
```ts
const lazyWithRetry = (importFn) => lazy(() =>
  importFn().catch(() => { window.location.reload(); return importFn(); })
);
```

