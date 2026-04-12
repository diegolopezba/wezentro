

## Prefetch Events During Splash Screen

**Why it works**: The splash screen already blocks for 1.2 seconds. Currently that time is wasted — the event queries only start when `Index.tsx` mounts *after* the splash fades. By prefetching during the splash, cards appear instantly with zero skeleton time.

**How Instagram/TikTok do it**: They start API calls the moment the app launches, while the splash animation plays. By the time the splash fades, data is already in memory.

### Implementation

**File: `src/App.tsx`**

Since `QueryClientProvider` already wraps the splash screen (line 118), we can use `queryClient.prefetchQuery()` during the splash phase to warm the cache:

1. Add a `useEffect` inside `App` (runs on mount) that calls `queryClient.prefetchQuery` for the main events query — the same `["for-you-events"]` query key and fetch function used in `useForYouEvents.ts`
2. This runs in parallel with the splash animation timer
3. When `Index.tsx` mounts after splash, `useQuery` finds cached data and renders cards immediately — no skeleton flash

```text
Timeline (current):
  [--- splash 1.2s ---][--- skeleton 300-500ms ---][cards]

Timeline (after fix):
  [--- splash 1.2s (fetching in background) ---][cards instantly]
```

**What changes**:
- Extract the core events fetch function to a shared constant so both `App.tsx` and `useForYouEvents.ts` use the same query key/function
- Add one `useEffect` in `App` that prefetches during splash
- No other files change — TanStack Query deduplicates automatically

