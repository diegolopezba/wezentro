
# User Preference Learning System

## Overview
Build a system that learns what users like based on their behavior, then uses those learned preferences to personalize the "Para Ti" feed. This works silently in the background - no user action required.

---

## Data Signals We'll Collect

### Engagement Actions (Weighted by Intent Strength)

| Action | Weight | Reasoning |
|--------|--------|-----------|
| Join guestlist | 100 | Strongest signal - real commitment |
| Save event | 80 | High intent to attend |
| Like event | 60 | Clear positive signal |
| Repost | 70 | Willing to share publicly |
| View (3+ seconds) | 20 | Mild interest |
| Click into detail | 30 | Curiosity |

### What We Learn From Each Action
- **Category preference**: "This user likes `club` events"
- **Creator affinity**: "This user engages with @djmike's events"
- **Time preference**: "This user likes events on weekends"
- **Location preference**: "This user prefers downtown events"

---

## Technical Implementation

### Phase 1: Database Schema

**New Table: `user_category_preferences`**
Stores learned category scores per user:

```text
┌─────────────────────────────────────────────────────┐
│ user_category_preferences                           │
├─────────────────────────────────────────────────────┤
│ id           UUID PRIMARY KEY                       │
│ user_id      UUID REFERENCES profiles(id)           │
│ category     TEXT NOT NULL                          │
│ score        DECIMAL DEFAULT 0                      │
│ interaction_count INTEGER DEFAULT 0                 │
│ last_interaction TIMESTAMP                          │
│ created_at   TIMESTAMP                              │
│ updated_at   TIMESTAMP                              │
│ UNIQUE(user_id, category)                           │
└─────────────────────────────────────────────────────┘
```

**New Table: `user_creator_preferences`**
Stores creator affinity (who does the user engage with):

```text
┌─────────────────────────────────────────────────────┐
│ user_creator_preferences                            │
├─────────────────────────────────────────────────────┤
│ id           UUID PRIMARY KEY                       │
│ user_id      UUID REFERENCES profiles(id)           │
│ creator_id   UUID REFERENCES profiles(id)           │
│ score        DECIMAL DEFAULT 0                      │
│ interaction_count INTEGER DEFAULT 0                 │
│ last_interaction TIMESTAMP                          │
│ UNIQUE(user_id, creator_id)                         │
└─────────────────────────────────────────────────────┘
```

**Expand `event_interactions` types**
Add new interaction types: `like`, `save`, `join`, `repost`, `click`

---

### Phase 2: Tracking Infrastructure

**Create `src/lib/preferenceTracking.ts`**
Centralized module to track all preference-relevant actions:

```typescript
// Signal weights for learning
const SIGNAL_WEIGHTS = {
  join: 100,
  save: 80,
  repost: 70,
  like: 60,
  click: 30,
  view: 20,
};

// Track and update preferences
export const trackPreferenceSignal = async (
  userId: string,
  eventId: string,
  signalType: keyof typeof SIGNAL_WEIGHTS
) => {
  // 1. Record in event_interactions
  // 2. Get event category and creator
  // 3. Update user_category_preferences (upsert)
  // 4. Update user_creator_preferences (upsert)
};
```

**Integration Points**
Update existing hooks to call `trackPreferenceSignal`:

| Hook | Action to Track |
|------|-----------------|
| `useLikeEvent` | `like` |
| `useSaveEvent` | `save` |
| `useJoinGuestlist` | `join` |
| `useRepost` | `repost` |
| `EventDetail.tsx` | `click` (on mount) |

---

### Phase 3: Algorithm Enhancement

**Update `useForYouEvents.ts`**

Add new scoring factor: **Learned Preferences (15%)**

Current weights will be adjusted:
- Proximity: 25% → 20%
- Popularity: 20% → 15%
- Explicit Interests: 20% → 15%
- **Learned Preferences: 0% → 15%** (NEW)
- Friends Going: 20% → 20%
- Recency: 10% → 10%
- Timing: 5% → 5%

**New scoring function:**
```typescript
const getLearnedPreferenceScore = (
  eventCategory: string | null,
  eventCreatorId: string,
  userCategoryPrefs: Record<string, number>,
  userCreatorPrefs: Record<string, number>
): number => {
  let score = 50; // Neutral baseline
  
  // Category affinity (0-100 normalized)
  if (eventCategory && userCategoryPrefs[eventCategory]) {
    score += userCategoryPrefs[eventCategory] * 0.6;
  }
  
  // Creator affinity
  if (userCreatorPrefs[eventCreatorId]) {
    score += userCreatorPrefs[eventCreatorId] * 0.4;
  }
  
  return Math.min(100, score);
};
```

---

### Phase 4: Fetch Learned Preferences

**New hook: `useUserPreferences.ts`**
Fetches user's learned preferences for the algorithm:

```typescript
export const useUserPreferences = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      // Fetch category preferences
      const { data: categories } = await supabase
        .from("user_category_preferences")
        .select("category, score")
        .eq("user_id", userId);
      
      // Fetch creator preferences  
      const { data: creators } = await supabase
        .from("user_creator_preferences")
        .select("creator_id, score")
        .eq("user_id", userId);
      
      return {
        categories: Object.fromEntries(categories.map(c => [c.category, c.score])),
        creators: Object.fromEntries(creators.map(c => [c.creator_id, c.score]))
      };
    },
    enabled: !!userId,
  });
};
```

---

## Score Decay (Freshness)

To prevent stale preferences, implement time decay:
- Recent interactions (last 7 days): 100% weight
- 7-30 days: 70% weight
- 30-90 days: 40% weight
- 90+ days: 20% weight

This is calculated when fetching preferences, not stored.

---

## File Changes Summary

### New Files (3)
1. `src/lib/preferenceTracking.ts` - Core tracking logic
2. `src/hooks/useUserPreferences.ts` - Fetch learned preferences
3. Database migration for new tables

### Modified Files (6)
1. `src/hooks/useEventLikes.ts` - Add preference tracking
2. `src/hooks/useSavedEvents.ts` - Add preference tracking
3. `src/hooks/useGuestlist.ts` - Add preference tracking
4. `src/hooks/useReposts.ts` - Add preference tracking
5. `src/pages/EventDetail.tsx` - Track click signal
6. `src/hooks/useForYouEvents.ts` - Integrate learned preferences

---

## Example User Journey

```text
Day 1: Maria opens app, sees generic feed
       → Views 3 club events, likes 1

Day 2: Maria saves a house_party event
       → Preferences: club (score: 80), house_party (score: 80)

Day 3: Feed now shows more club/house_party events
       Maria joins guestlist for @djmike's event
       → Creator preference: @djmike (score: 100)

Day 7: Maria's feed prioritizes:
       1. Club events by @djmike (perfect match)
       2. House party events nearby
       3. Club events by others she follows
```

---

## Privacy Considerations
- Preferences are stored per-user, not shared
- No personally identifiable data exposed
- User can clear preferences (future feature)
- Preferences only used for their own feed personalization
