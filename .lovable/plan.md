
# Performance Optimization Implementation

## Overview
Comprehensive optimizations to significantly reduce load times and improve navigation smoothness, with all map markers using red dots (brand color) as requested.

---

## Changes Summary

### 1. Create PageLoader Component
**New file: `src/components/PageLoader.tsx`**

Simple loading spinner with correct dark background to prevent white flash during lazy loading:
```typescript
import { Loader2 } from "lucide-react";

export const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);
```

---

### 2. Rewrite App.tsx with Lazy Loading + Query Caching

**Key changes:**
- Configure QueryClient with 5-minute staleTime (eliminates refetching on navigation)
- Convert all 26 page imports to `React.lazy()`
- Wrap each page individually in Suspense with PageLoader fallback
- Reduce splash screen from 2000ms to 1200ms

**Critical implementation detail (prevents black screen):**
- Each route wraps only the page component in Suspense, NOT the entire Routes container
- ProtectedRoute stays outside Suspense to handle auth loading state properly
- AppLayout is inside each page, so it loads with the page content

```typescript
import { Suspense, lazy, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageLoader } from "@/components/PageLoader";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Discover = lazy(() => import("./pages/Discover"));
// ... all 26 pages

// Configure query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 minutes
      gcTime: 1000 * 60 * 30,      // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Routes with individual Suspense boundaries
<Route path="/" element={
  <ProtectedRoute requireProfile>
    <Suspense fallback={<PageLoader />}>
      <Index />
    </Suspense>
  </ProtectedRoute>
} />
```

---

### 3. Convert Map Markers to Red Dots

**Modify: `src/components/map/MiniEventMarker.tsx`**

Replace image-based card markers with lightweight red dot markers:
- All dots are red (brand color `hsl(351, 100%, 50%)`)
- Size scales from 8px to 14px based on zoom
- Tonight events get pulsing glow animation
- Hover state scales up to 1.3x

```typescript
export const createDotMarkerElement = ({ isTonight }, zoom) => {
  const size = getMarkerSize(zoom); // 8-14px based on zoom
  
  return `
    <div class="event-dot ${isTonight ? 'tonight' : ''}" 
         style="width: ${size}px; height: ${size}px;"></div>
  `;
};

// CSS for dots
.event-dot {
  background-color: hsl(351, 100%, 50%);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(230, 0, 35, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.event-dot.tonight {
  animation: pulse-dot 2s ease-in-out infinite;
}
```

**Modify: `src/components/map/MapView.tsx`**
- Update `createCustomMarkers` to use dot markers instead of image cards
- Remove imageUrl from marker creation (not needed for dots)

---

### 4. Vite Build Optimization

**Modify: `vite.config.ts`**

Add manual chunks for vendor splitting:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        "vendor-react": ["react", "react-dom", "react-router-dom"],
        "vendor-query": ["@tanstack/react-query"],
        "vendor-ui": ["framer-motion", "@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-select"],
        "vendor-map": ["mapbox-gl"],
        "vendor-charts": ["recharts"],
      },
    },
  },
},
```

---

### 5. Lazy Load Dashboard Charts

**Modify: `src/pages/BusinessDashboard.tsx`**

Lazy load heavy Recharts components:
```typescript
const EngagementChart = lazy(() => import("@/components/dashboard/EngagementChart"));
const StatusPieChart = lazy(() => import("@/components/dashboard/StatusPieChart"));
const GuestlistFunnel = lazy(() => import("@/components/dashboard/GuestlistFunnel"));

// In JSX with skeleton fallback
<Suspense fallback={<div className="h-64 bg-secondary/50 rounded-xl animate-pulse" />}>
  <EngagementChart events={eventPerformance || []} isLoading={eventsLoading} />
</Suspense>
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/PageLoader.tsx` | Create | Loading spinner component |
| `src/App.tsx` | Modify | Lazy imports, query caching, reduced splash |
| `src/components/map/MiniEventMarker.tsx` | Modify | Red dot markers instead of image cards |
| `src/components/map/MapView.tsx` | Modify | Update marker creation for dots |
| `vite.config.ts` | Modify | Add manualChunks for vendor splitting |
| `src/pages/BusinessDashboard.tsx` | Modify | Lazy load chart components |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Initial bundle | ~800KB | ~250KB |
| Time to Interactive | 4-5s | 1.5-2s |
| Page navigation | Refetch + spinner | Instant (cached) |
| Map marker load | 50+ images | 0 images |
| Map zoom/pan | Janky | Smooth 60fps |
| Splash screen | 2.0s | 1.2s |

---

## Safeguards Against Previous Issues

1. **No black screen**: Each route has its own Suspense boundary (not the entire Routes tree)
2. **Navbar always visible**: AppLayout is inside each page, loads with content
3. **Map always loads**: MapView stays synchronous, only marker logic changes
4. **Auth state preserved**: ProtectedRoute handles auth loading before Suspense
5. **Dark background**: PageLoader uses `bg-background` to match app theme
