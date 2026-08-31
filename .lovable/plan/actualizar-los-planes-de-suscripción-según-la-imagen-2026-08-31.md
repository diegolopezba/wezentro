# Actualizar los planes de suscripción según la imagen

Los tres planes pasan a ser **Básico (Bs. 250/mes)**, **Profesional (Bs. 300/mes)** y **Premium (Bs. 500/mes)**, con el contenido y el orden de features exactamente como en la imagen.

## Cambios de contenido

**Básico — Bs. 250/mes (Bs. 8 por día) · Hasta 9 mesas**
- Lo esencial para empezar a recibir reservas
- Reservas online básicas: confirmación automática, sin llamadas ni WhatsApp
- Menú básico: publicá tu menú con cada publicación
- Conteos del día: total de reservas e invitados

**Profesional — Bs. 300/mes (Bs. 10 por día) · Hasta 20 mesas**
- Control total de tu operación de reservas
- Todo lo de Básico: reservas y menús completos
- Múltiples turnos: desayuno, almuerzo y cena por separado
- Analíticas completas: no-shows, cancelaciones, horarios que más se llenan, demografía de tu público y más

**Premium — Bs. 500/mes (Bs. 17 por día) · Más de 20 mesas**
- Para lugares que quieren ir un paso adelante
- Todo lo de Profesional
- Waiting List: aprovechá la cancelación de un cliente para notificar a otro
- Prioridad en discovery: mejor posicionamiento en el feed de descubrimiento
- Insights de la ciudad: información y comparaciones con otras empresas del rubro

Además, la nota al pie de la pantalla de planes: **todos los eventos y experiencias con ticketing tienen 6% de comisión por entrada vendida** (sin mensualidad).

## Movimientos de features entre planes

- "Prioridad en Discover" pasa de Profesional a Premium.
- Se agrega una nueva feature `reservation_waitlist` (lista de espera de reservas), exclusiva de Premium.
- "Plano visual del local" sale del listado visible (queda como feature interna reservada), ya que no aparece en la imagen.
- Fechas bloqueadas, ritmo de llegadas, unir mesas y políticas completas siguen en Profesional (son parte de "control total de reservas"), solo que no se listan como bullets destacados.

## Detalle técnico

- `src/lib/subscriptionTiers.ts`: precio de Profesional 350 → 300; nombre del tercer tier "Elite" → "Premium" (se mantiene la clave interna `elite` para no romper la columna `business_subscriptions.tier` ni sus datos actuales); se reescriben `tagline`, `bullets` y `highlights` con el texto de arriba; `priority_placement` se quita de `PROFESIONAL_FEATURES` y queda solo en el tier Premium; se agrega la feature key `reservation_waitlist` al tier Premium; se actualiza `TIER_COMPARISON` (Prioridad en Discover: solo Premium; nueva fila de Waiting List).
- `src/components/subscriptions/PlanRecommendationStep.tsx`: la etiqueta de la opción de más de 20 mesas se mantiene apuntando a la clave `elite`, ya renombrada visualmente a Premium.
- Se revisa que no quede texto "Elite" hardcodeado en otras pantallas (BusinessSettings, LockedFeature, PlansSheet usan el nombre desde la config, así que se actualizan solos).
- No se toca la base de datos, `useSubscriptionTier`, ni `subscriptionBilling.ts`.
- El gating real de la lista de espera de reservas queda definido en la config; si querés que además bloquee la UI de `reservation_waitlist` hoy mismo, lo agrego en el mismo pase.
