
# Guest Browsing Mode Implementation Plan

## Overview
Transform the app to allow new users to explore events, discover the map, and view profiles without requiring signup first - similar to Dice.fm's approach. Users will only be prompted to sign up when they attempt to perform actions like joining a guestlist, saving events, or messaging.

---

## What Guests CAN Do (Browse-Only)
- View the homepage event feed ("Para Ti" tab)
- Explore the map on Discover page
- View event details (already works!)
- View user profiles and their events
- Search for events and people

## What Triggers Login Prompt
- Like, save, or repost an event
- Join a guestlist / buy tickets
- Follow a user
- Send a message
- View own profile
- Create an event
- Access chats
- View saved events / notifications

---

## Technical Implementation

### Phase 1: Route Architecture Changes

**1.1 Create `GuestAllowedRoute` Component**
A new wrapper that allows both guests and authenticated users, but tracks navigation for post-login redirect:

```text
src/components/auth/GuestAllowedRoute.tsx

┌──────────────────────────────────────────┐
│  GuestAllowedRoute                       │
│  ├─ Always renders children              │
│  ├─ Does NOT redirect to /auth           │
│  └─ Stores intended destination for      │
│     post-login navigation                │
└──────────────────────────────────────────┘
```

**1.2 Update Route Configuration (App.tsx)**

| Route | Current | New |
|-------|---------|-----|
| `/` (Home) | ProtectedRoute | GuestAllowedRoute |
| `/discover` | ProtectedRoute | GuestAllowedRoute |
| `/user/:id` | ProtectedRoute | GuestAllowedRoute |
| `/event/:id` | Public (already) | Keep as-is |
| `/create` | ProtectedRoute | Keep ProtectedRoute |
| `/chats` | ProtectedRoute | Keep ProtectedRoute |
| `/profile` | ProtectedRoute | Keep ProtectedRoute |

---

### Phase 2: Auth Prompt Modal

**2.1 Create `AuthPromptModal` Component**
A friendly modal that appears when guests try to perform protected actions:

```text
┌─────────────────────────────────────────┐
│    ✨ Únete a Zentro                    │
│                                         │
│    [Event image/context preview]        │
│                                         │
│    Para [action description] necesitas  │
│    crear una cuenta                     │
│                                         │
│    [Crear Cuenta] (primary)             │
│    [Ya tengo cuenta] (secondary)        │
│                                         │
│    Cerrar                               │
└─────────────────────────────────────────┘
```

**2.2 Create `useAuthPrompt` Hook**
Centralized hook for triggering auth prompts with context:

```typescript
const { promptAuth } = useAuthPrompt();

// Usage in components:
const handleLike = () => {
  if (!user) {
    promptAuth({
      action: "dar like a este evento",
      returnTo: location.pathname
    });
    return;
  }
  // ... proceed with like
};
```

---

### Phase 3: Component Updates

**3.1 Index.tsx (Homepage)**
- Remove dependency on `requireProfile` for display
- Hooks already handle `!user` gracefully (useForYouEvents works without auth)
- Hide "Following" tab for guests (requires auth)
- Notification bell triggers auth prompt for guests

**3.2 Discover.tsx (Map)**
- Already fetches public events
- Search users shows results but profile click works
- Filter "friends going" disabled for guests

**3.3 UserProfile.tsx**
- Follow button triggers auth prompt for guests
- Message button triggers auth prompt for guests
- Profile viewing works without auth

**3.4 EventDetail.tsx (Already handles this well)**
- Like/Save/Repost buttons already check `if (!user)` and redirect
- Update to use modal instead of hard redirect

---

### Phase 4: Bottom Navigation for Guests

Update `BottomNav.tsx` to show appropriate behavior:

| Tab | Guest Behavior |
|-----|----------------|
| Home | Works normally |
| Discover | Works normally |
| Create | Shows AuthPromptModal |
| Chats | Shows AuthPromptModal |
| Profile | Shows AuthPromptModal |

---

### Phase 5: Hook Updates for Guest Safety

Update these hooks to return safe defaults for guests:

```text
useForYouEvents.ts     → Already works (returns public events)
useFollowingEventsScored.ts → Return empty for guests
useSearchUsers.ts      → Works (public data)
useIsEventLiked.ts     → Return false for guests
useIsEventSaved.ts     → Return false for guests
useIsFollowing.ts      → Return false for guests
```

---

## File Changes Summary

### New Files (3)
1. `src/components/auth/GuestAllowedRoute.tsx` - Route wrapper for guest-accessible pages
2. `src/components/auth/AuthPromptModal.tsx` - Friendly login/signup modal
3. `src/hooks/useAuthPrompt.tsx` - Context and hook for auth prompts

### Modified Files (8)
1. `src/App.tsx` - Update route wrappers
2. `src/pages/Index.tsx` - Handle guest mode (hide Following tab)
3. `src/pages/Discover.tsx` - Handle guest mode
4. `src/pages/UserProfile.tsx` - Auth prompts for actions
5. `src/pages/EventDetail.tsx` - Use modal instead of redirect
6. `src/components/layout/BottomNav.tsx` - Protected tab behavior
7. `src/components/events/EventCard.tsx` - Guest-safe interactions
8. `src/contexts/AuthContext.tsx` - Add returnTo state management

---

## User Flow Examples

**Flow 1: New User Opens App**
```
1. Splash screen → Homepage (sees events)
2. Scrolls feed, taps event → Event detail (views)
3. Taps "Unirse" → AuthPromptModal appears
4. Signs up → Redirected back to event detail
5. Taps "Unirse" again → Joins successfully
```

**Flow 2: Guest Explores Map**
```
1. Opens Discover → Map loads with events
2. Taps marker → Event card appears
3. Taps event → Event detail
4. Taps heart (like) → AuthPromptModal
5. "Ya tengo cuenta" → Login → Returns to event
```

---

## Benefits
- Lower barrier to entry for new users
- Users can evaluate the app before committing
- Native app store expectation (most apps allow browsing)
- Increases conversion by showing value first
- Matches Dice.fm, Eventbrite, Meetup patterns
