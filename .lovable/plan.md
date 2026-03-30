

## Fix: Comment Input Avatar Shows Default Instead of Profile Picture

**Problem**: Line 175 of `CommentsSheet.tsx` uses `user?.user_metadata?.avatar_url` from the auth JWT. This metadata is often empty or stale — the actual avatar is stored in the `profiles` table, not in auth metadata.

**Fix**: Use the `useUserProfile` hook to fetch the current user's profile and use `profile.avatar_url` for the input bar avatar.

### Changes — `src/components/events/CommentsSheet.tsx`

1. Import `useUserProfile` from `@/hooks/useUserProfile`
2. Call `useUserProfile(user?.id)` to get the profile data
3. Replace line 175:
   - **Before**: `<AvatarImage src={user?.user_metadata?.avatar_url || DEFAULT_AVATAR} />`
   - **After**: `<AvatarImage src={profile?.avatar_url || DEFAULT_AVATAR} />`

Single file, ~3 lines changed.

