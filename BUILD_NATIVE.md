# Zentro — Native Build Guide (iOS App Store Submission)

This guide covers everything you need to do **outside the Lovable codebase** to ship Zentro to the iOS App Store.

---

## 0. Prerequisites

- A Mac with **Xcode 15+** installed
- An **Apple Developer Program** membership ($99/year — https://developer.apple.com)
- Node.js 20+ and npm/bun
- Git

---

## 1. One-Time Setup

### 1.1 Export project to GitHub
1. In Lovable, click **GitHub → Connect to GitHub** (top right).
2. Push to your repo, then `git clone` it locally.

### 1.2 Install & add iOS
```bash
cd zentro
npm install
npx cap add ios
```

### 1.3 Copy the privacy manifest
Apple requires `PrivacyInfo.xcprivacy` for App Store submission.
```bash
cp ios-templates/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
```
Then in Xcode: drag the file into the `App` group in the project navigator and check **"Copy items if needed"** + **"Add to targets: App"**.

### 1.4 App ID & signing
- Apple Developer Portal → **Identifiers → +** → App IDs → App
- Bundle ID: `app.lovable.a812f800384e4a80818ea38ac62424d4`
- Capabilities: **Push Notifications**, **Sign in with Apple** *(skip — we don't use it)*, **Associated Domains** *(only if you ship deep links)*
- In Xcode → **Signing & Capabilities**: select your team. Enable **Push Notifications**.

### 1.5 OneSignal APNs key
- Apple Developer → **Keys → + → APNs**. Download the `.p8`.
- OneSignal dashboard → app `5b6aae46-50f4-4a83-b3cf-bf62ec1138f1` → Settings → Apple iOS (APNs) → upload the key, Team ID, Key ID, Bundle ID.

### 1.6 Mapbox token restriction
- Mapbox dashboard → tokens → restrict your public token to:
  - URL: `https://zentro.today/*`, `https://wezentro.lovable.app/*`
  - iOS bundle ID: `app.lovable.a812f800384e4a80818ea38ac62424d4`

---

## 2. Every Build (TestFlight / App Store)

```bash
git pull
npm install
NODE_ENV=production npm run build
NODE_ENV=production npx cap sync ios
npx cap open ios
```

**Important:** `NODE_ENV=production` strips the `server.url` hot-reload block from `capacitor.config.ts`. Without it, the App Store version would load from the Lovable preview URL (instant rejection + serious security issue).

### In Xcode
1. Bump **Version** (e.g. 1.0.0 → 1.0.1) and **Build** (auto-increment).
2. Select **Any iOS Device (arm64)** as run target.
3. **Product → Archive**.
4. Window → Organizer → **Distribute App → App Store Connect → Upload**.

---

## 3. App Store Connect Listing Fields

### Basics
- **Name:** Zentro
- **Subtitle:** El Pinterest de la vida nocturna
- **Primary category:** Lifestyle
- **Secondary:** Entertainment
- **Age rating:** 17+ (Frequent/Intense Alcohol, Tobacco, or Drug Use References — required because the app surfaces nightlife/club content)
- **Price:** Free, no IAP

### Description (ES)
> Zentro es la forma más fácil de descubrir la vida nocturna de tu ciudad. Encuentra clubs, bares, conciertos y eventos cerca de ti, guarda los que te gustan, comparte con amigos y nunca te pierdas lo que está pasando esta noche.
>
> • Descubre eventos por categoría, ubicación y popularidad
> • Sigue a tus venues y promotores favoritos
> • Compra entradas con QR boliviano (BNB)
> • Guarda eventos para ver más tarde
> • Lista de invitados y RSVP
> • Mensajes directos con tus amigos
>
> Solo para mayores de 18 años.

### Keywords (100 chars max)
`vida nocturna,eventos,bolivia,clubs,bares,fiestas,conciertos,boletos,salir,planes,nightlife`

### Privacy questionnaire — answers
- Do you collect data? **Yes**
- Used for tracking? **No**
- Linked to user? **Yes** for: Email, Name, Photos/videos, Coarse Location, Device ID, Purchase History, User Content
- Used for: App Functionality, Authentication

### App Review notes (paste verbatim)
```
Demo account:
  email: review@zentro.today
  password: <create a real test account before submitting>

PAYMENTS — IAP EXEMPTION:
This app processes two types of payments, both exempt from Apple IAP:

1. Event tickets (PaymentQRModal.tsx): physical real-world admission to
   bars/clubs/concerts in Bolivia, paid via the BNB bank QR system.
   Exempt under Guideline 3.1.3(e) — physical goods/services.

2. Sponsored post boosts (charge-boost edge function): B2B advertising
   spend by businesses promoting their content. Exempt under
   Guideline 3.1.3(b) / 3.1.5(a) — advertising services.

Account deletion: Settings → Ayuda → Eliminar cuenta.
Minimum age: 18 (enforced at onboarding).
```

---

## 4. Pre-Submission Checklist

- [ ] `NODE_ENV=production` build was used (no `server.url` in `capacitor.config.ts`)
- [ ] Tested on a real iPhone via TestFlight
- [ ] Push notifications work on device (not just simulator)
- [ ] Account deletion works end-to-end
- [ ] Sign-up blocks anyone under 18
- [ ] Privacy manifest copied into Xcode project
- [ ] APNs key uploaded to OneSignal
- [ ] Mapbox token restricted to bundle ID
- [ ] Screenshots ready (3–10 each for 6.7" and 6.5" iPhones)
- [ ] 1024×1024 App Store icon uploaded

---

## 5. Assets You Need to Provide

| Asset | Spec |
|---|---|
| App icon | 1024×1024 PNG, no transparency, no rounded corners |
| iPhone 6.7" screenshots | 1290×2796, 3–10 images |
| iPhone 6.5" screenshots | 1242×2688, 3–10 images |
| App preview video (optional) | 15–30s, portrait |

Send the 1024×1024 icon to Lovable and the AI will generate all required iOS icon sizes plus update the splash screen.
