

## Pre-deployment audit results

I ran a full sweep: TypeScript (clean), production build (succeeds), error boundary (in place), runtime/console/network logs (no errors), routing, PWA assets, storage usage. The good news: **the app is stable and won't crash**. The bad news: there's **one App Store rejection blocker** plus a few performance and polish issues.

---

### 🔴 BLOCKER — App Store rejection guaranteed (Apple Guideline 1.2 — User Generated Content)

Apple **rejects any UGC app** that doesn't ship with all four of these. Zentro has zero of them:

1. **Report content** button on every event/post/comment/profile
2. **Block user** functionality (and a list to manage blocks)
3. **EULA** with a no-tolerance clause for objectionable content
4. **Mechanism for filtering objectionable content** (handled via report → review)

This is the #1 reason social apps get rejected. Without it, we won't pass review. Estimated work: ~1 day (one `reports` table, one `blocked_users` table, report sheet component, block toggle in profile dropdown, blocklist filter in feed queries).

---

### 🟠 Performance / size issues

| Issue | Impact | Fix |
|---|---|---|
| `vendor-map` chunk = **1.67 MB** (Mapbox) | Slow first-load on /discover; flagged in Lighthouse | Already lazy-loaded — verify Mapbox isn't pulled into `index` chunk; confirm it only loads when /discover is hit |
| `index` main chunk = **564 KB** | Slow initial paint | Audit imports — likely `recharts` or another library pulled in by the root |
| `vendor-charts` = **411 KB** loaded for non-business users | Wasteful | Confirm BusinessDashboard is the only consumer and route-split it |
| 229 `console.*` calls in 24 files | Minor — production console pollution | Logger already strips `console.log`; audit `console.error` calls that leak PII |

---

### 🟡 Code quality / store polish

- **254 `as any` casts in 21 files** — mostly around `profile` properties (`menu_enabled`, `business_phone`, etc.). The Supabase types are out of date with these columns. Risk: silent runtime nulls. Should regenerate types.
- **`maximum-scale=1.0, user-scalable=no` in viewport meta** — Apple recommends against disabling user-scalable for accessibility; some reviewers flag it. Low risk but worth removing the `user-scalable=no`.
- **Hardcoded `og:image` / `favicon` from `gpt-engineer-file-uploads`** in `index.html` — works but unprofessional URLs in source. Should self-host in `/public`.
- **No `manifest.webmanifest`** in `/public` — VitePWA generates one at build, so this is fine, but verify it's emitted with proper name/icons for "Add to Home Screen" prompt on iOS.
- **`SplashScreen.tsx`** runs on every mount with `minDisplayTime={1200}` — adds 1.2s to every cold start. Native Capacitor splash already covers this. Recommend reducing to 400ms or removing entirely on native.
- **Hardcoded English error text** in `ErrorBoundary` ("Something went wrong", "Reload") — rest of app is Spanish. Should localize.

---

### 🟢 What's already solid

- TypeScript compiles clean
- Production build succeeds
- ErrorBoundary catches render crashes
- Service worker uses NetworkFirst for navigation (no stale chunks)
- Chunk-load retry with sessionStorage guard
- Lazy retry on import failures
- All Capacitor iOS privacy strings present (`NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, etc.)
- Auth persists via localStorage (correct)
- Push notifications properly gated behind permission prompt

---

### Recommended fix order (priority)

| # | Fix | Why first | Effort |
|---|---|---|---|
| 1 | **Add Report + Block + EULA** | Apple **will reject** without it | ~1 day |
| 2 | Reduce SplashScreen min display to 400ms | Faster cold start (perceived) | 5 min |
| 3 | Audit `index` chunk for unnecessary imports | First paint speed | 30 min |
| 4 | Localize ErrorBoundary to Spanish | Polish | 5 min |
| 5 | Remove `user-scalable=no` from viewport | Accessibility | 1 min |
| 6 | Self-host favicon + og:image | Polish | 10 min |
| 7 | Regenerate Supabase types to remove `as any` | Type safety | 10 min |

---

### My recommendation

**Tackle #1 (Report + Block + EULA) before submitting to either store.** Everything else can ship as-is and be patched in v1.0.1. Without #1, we'll get an Apple rejection email within 24-48 hours of submission and have to resubmit, losing a review cycle (~2-3 days).

Want me to plan the Report + Block implementation in detail? It needs:
- `reports` table (reporter, target type, target id, reason, status)
- `blocked_users` table (blocker, blocked) with RLS
- Report sheet component (reusable for events, comments, profiles)
- Block action in profile dropdown + UserProfile
- Filter blocked users out of feed/chats/comments queries
- EULA acceptance gate added to onboarding
- "Mis bloqueos" page in Settings

