
# Comprehensive Onboarding Walkthrough System

## Overview
Build a multi-tier walkthrough system that provides contextual guidance to new users based on their subscription level. The system will include:
1. **General Walkthrough** - For all new users covering core features
2. **Zentro Food Walkthrough** - For users who just subscribed to Food tier
3. **Zentro Business Walkthrough** - For users who just subscribed to Business tier

## User Experience Flow

### General Walkthrough (New Users)
Triggered after completing profile creation and reaching the homepage for the first time.

| Step | Page | Target | Message (Spanish) |
|------|------|--------|-------------------|
| 1 | Home | "Para Ti" tab | "Aqui encontrarás eventos personalizados basados en tus intereses y ubicación" |
| 2 | Home | Event card (guestlist preview) | "Toca un evento para ver detalles. Si eres Zentro Premium, puedes ver quién va en la lista de invitados" |
| 3 | Event Detail | Join/Guestlist button area | "Aqui puedes unirte a la lista de invitados o comprar tickets. Necesitas Zentro Premium para acceder" |
| 4 | Discover | Map area | "Explora eventos cerca de ti en el mapa interactivo" |
| 5 | Discover | Category filter bar | "Filtra eventos por categoría: clubs, bares, restaurantes, cafés y más" |
| 6 | Create | Full page overview | "Crea un **Evento** con fecha, ubicación y opción de lista de invitados, o un **Post** simple sin esos detalles" |

### Zentro Food Walkthrough
Triggered when user's subscription changes to `food_premium`.

| Step | Page | Target | Message (Spanish) |
|------|------|--------|-------------------|
| 1 | Profile | Menu button | "¡Bienvenido a Zentro Food! Toca aquí para gestionar tu menú" |
| 2 | EditMenuSheet | Add item button | "Agrega items a tu menú con nombre, descripción y precio. Puedes reordenarlos después" |

### Zentro Business Walkthrough
Triggered when user's subscription changes to `business_premium`.

| Step | Page | Target | Message (Spanish) |
|------|------|--------|-------------------|
| 1 | Dashboard | Stats overview | "Tu Dashboard de Negocios: ve estadísticas de eventos, asistencia y conversión" |
| 2 | Dashboard | Event performance table | "Analiza el rendimiento de cada evento: solicitudes, aprobaciones y check-ins" |
| 3 | Event Detail (mock) | Edit button/QR section | "En tus eventos, puedes subir un QR de pago para vender tickets directamente" |
| 4 | Event Detail (mock) | Manage button | "Gestiona tu lista: aprueba solicitudes y confirma pagos de asistentes" |

## Technical Architecture

### State Management
```text
src/contexts/WalkthroughContext.tsx
- currentWalkthrough: "general" | "food" | "business" | null
- currentStep: number
- isActive: boolean
- nextStep(): void
- skipWalkthrough(): void
- completeWalkthrough(): void
- startWalkthrough(type): void
```

### Persistence Strategy
- **General walkthrough**: `localStorage.getItem("zentro_walkthrough_complete")`
- **Food walkthrough**: `localStorage.getItem("zentro_food_walkthrough_complete")`
- **Business walkthrough**: `localStorage.getItem("zentro_business_walkthrough_complete")`
- **Subscription tier tracking**: Compare previous vs current `plan_type` to detect upgrades

### Component Structure

```text
src/components/walkthrough/
├── WalkthroughProvider.tsx      # Context provider with step logic
├── CoachMark.tsx                # Reusable tooltip component
├── WalkthroughOverlay.tsx       # Dimmed backdrop (optional)
├── steps/
│   ├── generalSteps.ts          # Step definitions for new users
│   ├── foodSteps.ts             # Step definitions for Food tier
│   └── businessSteps.ts         # Step definitions for Business tier
```

### CoachMark Component
A reusable component that wraps target elements with a highlighted tooltip:

```text
<CoachMark 
  step={1}
  walkthrough="general"
  title="Para Ti"
  message="Eventos personalizados..."
  position="bottom"
>
  <TabButton>Para Ti</TabButton>
</CoachMark>
```

Features:
- Uses existing `Tooltip` or `Popover` component internally
- Pulsing highlight ring (brand red: `hsl(351, 100%, 50%)`)
- Animated entrance with Framer Motion
- "Siguiente" (Next) and "Omitir" (Skip) buttons
- Step indicator dots

### Subscription Change Detection
```text
src/hooks/useWalkthroughTrigger.ts
- Watches subscription.plan_type changes
- Compares with localStorage "zentro_last_seen_plan"
- Triggers appropriate walkthrough on upgrade
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. Create `WalkthroughContext.tsx` with state management
2. Create `CoachMark.tsx` component with animations
3. Create step definition files for each walkthrough type
4. Create `useWalkthroughTrigger.ts` hook for detecting subscription changes

### Phase 2: General Walkthrough Integration
1. Add CoachMark to `Index.tsx` (Para Ti tab, Event card)
2. Add CoachMark to `EventDetail.tsx` (Join/Guestlist area)
3. Add CoachMark to `Discover.tsx` (Map, Category filters)
4. Add CoachMark to `Create.tsx` (Event vs Post explanation)

### Phase 3: Tier-Specific Walkthroughs
1. Add CoachMark to `Profile.tsx` for Menu button (Food tier)
2. Add CoachMark to `EditMenuSheet.tsx` for add item (Food tier)
3. Add CoachMark to `BusinessDashboard.tsx` for stats (Business tier)
4. Add CoachMark to `EventDetail.tsx` for Edit/Manage buttons (Business tier)

### Phase 4: Navigation Logic
Some steps require navigation between pages:
- Store pending walkthrough state when navigating
- Resume walkthrough on target page mount
- Handle edge cases (user manually navigates away)

## Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/WalkthroughContext.tsx` | Global walkthrough state management |
| `src/components/walkthrough/CoachMark.tsx` | Reusable coach mark tooltip |
| `src/components/walkthrough/WalkthroughOverlay.tsx` | Optional dimmed backdrop |
| `src/components/walkthrough/steps/generalSteps.ts` | New user walkthrough steps |
| `src/components/walkthrough/steps/foodSteps.ts` | Food tier walkthrough steps |
| `src/components/walkthrough/steps/businessSteps.ts` | Business tier walkthrough steps |
| `src/hooks/useWalkthroughTrigger.ts` | Subscription change detection |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with `WalkthroughProvider` |
| `src/pages/Index.tsx` | Add CoachMarks for steps 1-2 |
| `src/pages/EventDetail.tsx` | Add CoachMark for step 3, Business steps 3-4 |
| `src/pages/Discover.tsx` | Add CoachMarks for steps 4-5 |
| `src/pages/Create.tsx` | Add CoachMark for step 6 |
| `src/pages/Profile.tsx` | Add CoachMark for Food step 1 |
| `src/components/menu/EditMenuSheet.tsx` | Add CoachMark for Food step 2 |
| `src/pages/BusinessDashboard.tsx` | Add CoachMarks for Business steps 1-2 |

## Design Specifications

### Coach Mark Styling
- Background: `bg-card` with `border border-border`
- Highlight ring: Pulsing animation with brand red (`hsl(351, 100%, 50%)`)
- Shadow: `shadow-elevated`
- Border radius: `rounded-2xl`
- Step indicator: Dots showing progress (filled = completed, hollow = remaining)

### Animations
- Coach mark fade in + scale: `opacity: 0 → 1, scale: 0.95 → 1`
- Highlight ring pulse: Subtle scale + opacity pulse
- Step transition: Crossfade between steps

### Typography
- Title: `text-sm font-semibold text-foreground`
- Message: `text-sm text-muted-foreground`
- Buttons: "Siguiente" (primary), "Omitir" (ghost/link)

## Expected Behavior

### New User Journey
1. User completes onboarding profile setup
2. Redirected to homepage, 1-second delay
3. Step 1 appears highlighting "Para Ti" tab
4. User taps "Siguiente" to progress through steps
5. Navigation prompts shown when next step is on different page
6. Walkthrough completes, stored in localStorage

### Subscription Upgrade Journey
1. User upgrades to Zentro Food or Business
2. Checkout success page redirects to relevant page
3. Tier-specific walkthrough begins automatically
4. Teaches new features exclusive to that tier

### Skip/Dismiss Behavior
- "Omitir" button dismisses entire walkthrough
- Tapping outside coach mark dismisses that step (advances to next)
- Walkthrough state persisted to prevent re-showing
