## Separar impresiones (card vista) de views (clicks al detalle)

### Nomenclatura (estándar publicitario)

- **impresiones** = veces que la card fue vista en algún feed/perfil/chat (tracking pasivo con IntersectionObserver).
- **views** = veces que un usuario abrió el detalle del evento (lo que `trackEventView` ya hace hoy).

### Modelo de datos

Reutilizar `event_interactions`. El tipo `'view'` actual ya representa clicks al detalle, así que **no se renombra nada** y no hay migración de datos:

- `type = 'view'` → click que abrió el detalle (sin cambios).
- `type = 'impression'` → **nuevo**: card vista en algún feed (tracking pasivo).

Nueva RPC `get_event_card_counts(_event_ids uuid[])` que devuelve `{ event_id, impression_count, view_count }` en una sola query. La RPC vieja `get_event_view_counts` se mantiene por compatibilidad pero deja de usarse en el código.

### Tracking (frontend)

Nuevo helper en `src/lib/analyticsTracking.ts`:

- `trackEventImpression(eventId, userId)` — dedupe **en memoria por sesión** (Set in-module) para no spamear DB en scroll, + dedupe **diario en DB** (mismo patrón que `trackEventView` hoy) para que el contador no infle con reloads.

Nuevo hook `src/hooks/useImpressionTracker.ts`:

- Devuelve un `ref` con `IntersectionObserver` (threshold 50%, delay 500ms para confirmar visibilidad real).
- Dispara `trackEventImpression` una vez por sesión por evento.

### Dónde se aplica el observer

- `src/components/events/TimelineCard.tsx` — Profile, UserProfile, Saved, related grid.
- `src/components/events/EventCard.tsx` — Para Ti / Siguiendo / Discover.
- `src/components/chat/EventInviteCard.tsx` — invites en chats.

### Visualización

- **Cards públicas (TimelineCard, EventCard)**: mostrar **impresiones** (lo que la decisión del usuario indicó — números más altos, mejor social proof). Reemplaza el `view_count` actual.
- **Business Dashboard** (`OverviewTab.tsx`, `EventsPerformanceTable.tsx`, `useBusinessAnalytics.ts`): mostrar las dos métricas:
  - "Impresiones" → veces que la card fue vista
  - "Views" → clicks al detalle
  - CTR = views / impresiones

### Archivos a tocar

- `src/lib/analyticsTracking.ts` — agregar `trackEventImpression`. `trackEventView` sin cambios.
- `src/hooks/useImpressionTracker.ts` — **nuevo**.
- `src/components/events/TimelineCard.tsx` — aplicar ref + cambiar prop `viewCount` para mostrar impresiones.
- `src/components/events/EventCard.tsx` — aplicar ref.
- `src/components/chat/EventInviteCard.tsx` — aplicar ref.
- `src/hooks/useUserTimeline.ts` — usar nueva RPC `get_event_card_counts`, exponer `impression_count` como lo que el TimelineCard muestra.
- `src/hooks/useBusinessAnalytics.ts` — separar impresiones vs views, calcular CTR.
- `src/components/dashboard/OverviewTab.tsx`, `EventsPerformanceTable.tsx` — UI dual con CTR.
- Migración: nueva RPC `get_event_card_counts`.

### Lo que NO cambia

- Schema de `event_interactions` (solo se empieza a usar un nuevo valor `'impression'` en `type`).
- RLS policies.
- `EventDetail.tsx` y `trackEventView` (siguen igual).
- Datos históricos (no se migra nada).
