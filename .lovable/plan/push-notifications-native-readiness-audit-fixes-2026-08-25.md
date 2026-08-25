# Push notifications: native readiness audit + fixes

Short answer: the plumbing is mostly there (OneSignal web SDK + `onesignal-cordova-plugin` v5, a `push_subscriptions` table, and a `send-push-notification` function), but it is **not ready to ship natively**. Four concrete gaps would make push either never ask for permission on iOS, or deliver to the wrong place.

## What is already correct
- `onesignal-cordova-plugin@5.3.0` is a real dependency, and `OneSignalContext` branches on `Capacitor.isNativePlatform()` to init the native SDK instead of the web one.
- Native subscribe flow requests permission, opts in, polls for the subscription ID, and upserts it into `push_subscriptions`.
- The web service worker is skipped on native.
- A pre-permission explainer sheet exists (Apple 5.1.1(ii) requirement).

## Gaps to fix

### 1. The permission prompt never appears in the native app (blocker)
`usePushNotificationPrompt` decides whether to show the explainer using web-only checks: it requires `"Notification" in window` and, on iOS, requires the page to be an installed PWA. In the native iOS WebView neither holds, so the explainer is suppressed and the user is never asked — push silently never works on the App Store build.

Fix: when `Capacitor.isNativePlatform()` is true, bypass the web checks entirely and rely on the native SDK's permission state.

### 2. Tapping a notification does not navigate anywhere
There is no `Notifications.addEventListener("click", ...)` on the native SDK. `useDeepLinks` only handles `appUrlOpen`, which is not fired by a OneSignal tap. Today a tap just opens the home screen, dropping the message/event context the payload already carries.

Fix: register a native click listener that reads `data.url` / `data.route` from the payload and routes through React Router, with a queued path for cold starts (fired before the router mounts).

### 3. Device identity is not tied to the account lifecycle
We never call `OneSignal.login(user.id)` / `logout()`, and we never remove the row from `push_subscriptions` on sign-out. On a shared or re-used device, notifications for the previous account keep landing on that device.

Fix: call `login(user.id)` when a session exists, `logout()` on sign-out, and delete that device's `push_subscriptions` row on sign-out.

### 4. Send path should target subscription IDs
`send-push-notification` uses the v1 `include_player_ids` field. It still works, but with the v5/v16 SDKs the stored values are subscription IDs; switching to `include_subscription_ids` (plus `ios_badgeType`/`ios_badgeCount` and an Android channel/small icon) is the supported path and gives correct badge behaviour on iOS.

## Build/store steps that are missing from BUILD_NATIVE.md
- **Android push credentials**: only the APNs key is documented. OneSignal also needs the Firebase (FCM v1) service-account JSON for Android, plus `google-services.json` in the Android project.
- **iOS Notification Service Extension**: required for images in notifications, confirmed delivery and badge sync. Needs a separate target in Xcode and its own App Group.
- **`npx cap sync` after install** so the Cordova plugin is registered in both platforms.

## Scope of the code change
| File | Change |
|---|---|
| `src/hooks/usePushNotificationPrompt.ts` | Native branch that skips web-only gating |
| `src/contexts/OneSignalContext.tsx` | Native click listener, `login`/`logout` external ID, sign-out cleanup |
| `src/hooks/useDeepLinks.ts` (or a new `usePushNavigation`) | Consume the queued notification route on cold start |
| `supabase/functions/send-push-notification/index.ts` | `include_subscription_ids`, iOS badge fields, Android channel |
| `BUILD_NATIVE.md` | FCM setup, Notification Service Extension, `cap sync` step, push test checklist |

No database schema change is required.

## Verification
Native permission/delivery can only be fully verified on a real device via TestFlight, so this pass ends with a typecheck plus a documented on-device checklist (permission prompt appears, subscription row created, test push received in foreground/background/killed, tap routes to the right screen, sign-out stops delivery).
