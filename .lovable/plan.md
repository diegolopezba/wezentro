
Looking at the original 7-item priority list and what's been completed:

**✅ Done:**
1. Report + Block + EULA — tables, hooks, components, EulaGate mounted, /settings/blocks route, filters in useEvents/useFollowingEventsScored/useEventComments/useForYouEvents/useChats
2. SplashScreen reduced to 400ms
4. ErrorBoundary localized to Spanish
5. `user-scalable=no` removed from viewport

**❌ Still pending:**
3. Audit `index` chunk (564 KB) for unnecessary imports — first paint speed
6. Self-host favicon + og:image (currently hot-linked from `gpt-engineer-file-uploads`)
7. Regenerate Supabase types to remove 254 `as any` casts

**Plus partial gaps from the UGC work:**
- Block filter still NOT applied to `useNearbyEvents` and `useRelatedEvents` (map + "Más como esto" can still show blocked users' content)
- Report action not yet wired into `EventCard` long-press menu or chat messages
- No "Reportar" entry in `ShareProfileMenu` for non-blocked flow verification

---

## Remaining work plan

### 1. Finish UGC coverage (30 min)
- Add `useBlockedIds` filter to `useNearbyEvents.ts` and `useRelatedEvents.ts`
- Verify ReportSheet is reachable from every UGC surface (event detail ✅, comments ✅, profile ✅, chat messages ❌)

### 2. Self-host brand assets (10 min)
- Move favicon + og-image into `/public/` 
- Update `index.html` to reference local `/favicon.png` and `/og-image.png`
- Remove the `gpt-engineer-file-uploads` URLs

### 3. Shrink `index` chunk (30 min)
- Inspect what's bundled in the root chunk via build output
- Likely culprits: eager imports of heavy libs (recharts, mapbox, date-fns full) in `App.tsx`, `main.tsx`, or shared providers
- Convert eager imports to lazy where the consumer is route-scoped
- Target: drop `index` from 564 KB → under 350 KB

### 4. Regenerate Supabase types (5 min)
- Types file is auto-managed; trigger regeneration so new columns (`menu_enabled`, `business_phone`, `reports`, `blocked_users`, `eula_acceptances`, etc.) are typed
- Then sweep top offender files and remove `as any` casts where the new types now cover them (won't remove all 254, but ~60-70% of profile-related ones)

### 5. Final verification
- Run `tsc --noEmit` 
- Run production build, confirm bundle sizes
- Confirm EulaGate appears for a fresh user, Report sheet opens, Block hides content

---

### Files to touch

| File | Change |
|---|---|
| `src/hooks/useNearbyEvents.ts` | Add blocked-ids filter |
| `src/hooks/useRelatedEvents.ts` | Add blocked-ids filter |
| `src/components/chat/MessageBubble.tsx` | Add report action on long-press (optional) |
| `index.html` | Local favicon + og-image references |
| `public/favicon.png`, `public/og-image.png` | New self-hosted assets |
| `src/App.tsx` / providers | Audit & lazy-load any heavy eager imports |
| `src/integrations/supabase/types.ts` | Auto-regenerated |
| ~5-10 files using `(supabase as any)` for profile/reports/blocks | Remove casts where types now cover |

### What I'll skip unless you ask

- Chat message report (low priority — DMs are 1:1, blocking already covers it)
- Removing all 254 `as any` (many are intentional for cross-table joins; only fixing the easy wins)

After this, the app passes Apple's UGC bar AND has a measurably faster cold start. Ready for store submission.
