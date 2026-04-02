

## Fix: Events Created from Event Tab Appearing as Posts

### Root Cause
Two issues combine to cause this:

1. **`start_datetime` requires both date AND time** — Line 245 of `Create.tsx` only sets `start_datetime` when both `formData.date` AND `formData.time` are filled. If either is missing, it stays `null`.

2. **Post detection fallback overrides `is_post`** — The standardized logic `isPost = event.is_post || !event.start_datetime` treats anything without a `start_datetime` as a post, even when `is_post` is explicitly `false`.

So even though `is_post: false` is correctly saved, a missing time or date makes the event look like a post everywhere.

### Fix (two-part)

**Part A — Make `is_post` the single source of truth**

In `EventDetailOverlay.tsx` and `EventDetail.tsx`, change:
```ts
// Before
const isPost = event.is_post || !event.start_datetime;

// After
const isPost = !!event.is_post;
```

The fallback heuristic was added for legacy data, but it causes false positives. If old data needs fixing, a one-time migration is safer than a runtime heuristic that breaks new events.

**Part B — Require date+time for events at creation**

In `Create.tsx`, add validation in `handleSubmit` so events cannot be published without a date and time:
```ts
if (!isPost && (!formData.date || !formData.time)) {
  toast.error("Por favor ingresa la fecha y hora del evento");
  return;
}
```

This prevents the scenario where an event is saved without `start_datetime`.

### Files

| File | Change |
|---|---|
| `src/pages/Create.tsx` | Add date+time validation for events |
| `src/pages/EventDetail.tsx` | Remove `!event.start_datetime` fallback |
| `src/components/events/EventDetailOverlay.tsx` | Remove `!event.start_datetime` fallback |

