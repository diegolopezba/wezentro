# iOS App Store Readiness — Execution Plan

Decisions locked in:
1. **Minimum age: 18+**
2. **Remove Google Sign-In entirely** → no Sign in with Apple needed
3. **You provide 1024×1024 app icon** (upload after approval)
4. **Target: iOS App Store first**

---

## Phase A — Code & Compliance Changes (I do these)

### 1. Bump age gate to 18+
- `src/pages/Onboarding.tsx`: change `age < 13` → `age < 18`, update error copy ("Debes tener al menos 18 años…").
- Make birth date **required** (currently optional with "Omitir"). Without it we can't enforce the gate.
- Remove "Omitir por ahora" skip on step 3.
- Update `index.html` meta `age-restriction` 17+ → 18+.
- Update privacy/terms copy to state 18+ minimum.
- Update memory file `mem://auth/authentication-system` (13+ → 18+).

### 2. Remove Google Sign-In
- Audit `src/pages/Auth.tsx` and any auth UI for Google buttons → remove.
- Remove any `signInWithOAuth("google")` calls.
- Keep email/password only.
- (Lovable Cloud auth provider toggle is dashboard-side; no code needed there.)

### 3. Push notifications — add pre-prompt explainer
- New small sheet shown ~3s after login explaining *why* we want push (messages, event reminders, replies).
- Only if user taps "Activar" do we trigger the iOS native prompt via OneSignal.
- Update `usePushNotificationPrompt.ts` to gate on this user action instead of auto-prompting.
- Persist dismissal in localStorage so we don't nag.

### 4. Service worker safety on native
- In `src/main.tsx`: skip `serviceWorker.register` when `Capacitor.isNativePlatform()`. Service worker is only needed for the PWA web build, not the native WebView.

### 5. Capacitor production config hardening
- `capacitor.config.ts`: keep dev hot-reload behind `isDev`, but add an explicit comment + a `BUILD_NATIVE.md` step requiring `NODE_ENV=production npx cap sync` before any TestFlight build, so the `server.url` block is stripped.
- Add `NSMicrophoneUsageDescription` to iOS permissions (video uploads can capture audio).
- Confirm `cleartext: true` only ever appears under the dev guard.

### 6. Reviewer-note comments (IAP exemption)
- Add header comments in `PaymentQRModal.tsx` and `charge-boost/index.ts` explaining: physical event tickets + B2B advertising spend = exempt from Apple IAP per Guideline 3.1.3 / 3.1.5.

### 7. Account deletion discoverability
- Verify "Eliminar cuenta" is reachable in Settings within 2 taps. Move/relabel if buried.

### 8. iOS Privacy Manifest
- Create `ios/App/App/PrivacyInfo.xcprivacy` template declaring:
  - Data collected: email, name, photos, approximate location, device ID (OneSignal), purchase history (Stripe).
  - Tracking: **No** (we don't share IDs with data brokers).
  - Required Reason API usage for: `UserDefaults`, `FileTimestamp`, `SystemBootTime`, `DiskSpace` (Capacitor uses these).
- This file ships in the iOS project after `npx cap add ios`.

### 9. Documentation: `BUILD_NATIVE.md`
A single doc covering everything you'll need outside the codebase:
- Production build & sync commands
- Xcode signing + version/build number bump
- OneSignal: APNs key upload steps
- Mapbox: token URL/bundle restriction
- App Store Connect listing fields (description ES/EN, keywords, age rating answers, IAP exemption reviewer note, privacy questionnaire answers)
- TestFlight checklist before submission

---

## Phase B — You Do These (outside code)

| Task | Where |
|---|---|
| Disable Google provider | Lovable Cloud → Users → Auth Settings |
| Upload 1024×1024 app icon | Send to me; I'll generate the iOS icon set + splash |
| Apple Developer account ($99/yr) | developer.apple.com |
| Create App ID `app.lovable.a812f800384e4a80818ea38ac62424d4` | Apple Developer portal |
| Generate APNs Auth Key | Apple → upload to OneSignal |
| Restrict Mapbox token to bundle ID + zentro.today | Mapbox dashboard |
| App Store Connect: create app record | appstoreconnect.apple.com |
| Screenshots (3–10 per device size) | Take from real device |
| App description + keywords (ES + EN) | Draft in BUILD_NATIVE.md |
| Export project to GitHub → run `npx cap add ios` | Local Mac with Xcode |
| TestFlight build → internal testing | Xcode |
| Submit for review | App Store Connect |

---

## Execution Order (after approval)

1. Age gate → 18+
2. Strip Google sign-in
3. Push pre-prompt
4. SW guard on native
5. Capacitor config hardening + mic permission
6. IAP reviewer-note comments
7. Verify account deletion path
8. Generate `PrivacyInfo.xcprivacy` template
9. Write `BUILD_NATIVE.md`
10. Update memory files

After this ships, send me the 1024×1024 icon and I'll generate the full icon set.

Ready to execute on approval.