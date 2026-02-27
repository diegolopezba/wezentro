
## Security Assessment for a Social Network

After reviewing the RLS policies and the codebase, here is the honest assessment:

### What is FINE for a social network (no changes needed):
- **`profiles` fully public SELECT** — `USING (true)` is intentional and correct. Instagram, Twitter, TikTok all expose public profiles to everyone including unauthenticated visitors. ✅
- **`follows` public SELECT** — Follower/following counts and lists are public on every social network. ✅
- **`event_likes` public SELECT** — Like counts are public on all social platforms. ✅
- **`reposts` public SELECT** — Repost counts are public. ✅
- **`event_tags` public SELECT** — Who is tagged in a post is public. ✅

### The ONE real security issue to fix:

**`user_settings` has TWO SELECT policies**: "Anyone can view message settings" (USING: true) AND "Users can view own settings" (USING: auth.uid() = user_id). The first one is overly broad — while the `allow_messages_from` field itself is not super sensitive, the real issue is that `useCanMessageUser` (in `useUserSettings.ts`) currently queries `user_settings` directly from the client to check if a user can message another. This works fine with the public policy. However, the "Anyone can view" policy also exposes this to unauthenticated users, which is unnecessary — it should require being logged in.

**Fix**: Change "Anyone can view message settings" from `USING (true)` to `USING (auth.uid() IS NOT NULL)` — so only logged-in users can see another user's message preference. Unauthenticated scrapers can't enumerate user IDs and their privacy settings.

### The `profiles` sensitive fields concern:
The `profiles` table has `birth_date`, `gender`, `business_latitude`, `business_longitude`, `business_phone` exposed. These are low-risk for a social network because:
- `birth_date` / `gender` — users voluntarily enter these; no query in the app exposes raw birth dates to other users in the UI
- Business GPS coords — these are intentionally public (they appear on the map)
- Business phone — intentionally public (it's a contact number for a business)

No action needed on profiles.

### Summary of changes:

**One migration only:**
- Change `user_settings` "Anyone can view message settings" policy from `USING (true)` → `USING (auth.uid() IS NOT NULL)` so only authenticated users can check another user's message privacy setting. Unauthenticated scraping is blocked while the messaging feature still works perfectly.

No code changes needed — `useCanMessageUser` already runs inside authenticated routes.

### Files to change:
- **1 migration**: Update the `user_settings` SELECT policy for non-owners
