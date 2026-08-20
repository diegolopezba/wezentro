# Planes de suscripción para negocios de comida (Básico / Profesional / Elite)

Sistema de tiers solo para cuentas business con `business_type` en `FOOD_BUSINESS_TYPES` (restaurant, coffee, bar). Los negocios de eventos/ticketing no se ven afectados. Sin cobro real todavía: la activación se hace directo en la base de datos, y el punto de integración con Qhantuy queda aislado en un solo archivo.

## Etapa 1 — Config de tiers + esquema

**`src/lib/subscriptionTiers.ts`** (mismo patrón que `businessTypes.ts`):
- Claves de features: `multi_shift`, `blackout_dates`, `covers_pacing`, `table_joining`, `full_reservation_policy`, `reservas_analytics_full`, `priority_placement`, `venue_layout`, `city_insights`.
- `basico`: "Básico", `price_bob: 0 /* TODO: precio real */`, sin feature keys (turno único, menú básico, conteos simples).
- `profesional`: "Profesional", `price_bob: 0 /* TODO */`, incluye multi_shift, blackout_dates, covers_pacing, table_joining, full_reservation_policy, reservas_analytics_full, priority_placement.
- `elite`: "Elite", `price_bob: 0 /* TODO */`, todo lo anterior + venue_layout, city_insights.
- Cada tier lleva también una lista de bullets en español para la pantalla de Planes, y helper `tierForFeature(key)` para saber qué plan mínimo desbloquea una feature (usado en las etiquetas "Disponible en el plan X").

**Tabla `business_subscriptions`** (migración, mismo patrón de FK/RLS/GRANT que `qhantuy_beneficiaries`):
- `id`, `business_id` → `profiles.id` (único), `tier` (enum texto con CHECK), `status` (`active` | `pending_activation` | `past_due` | `cancelled`), `billing_period_start`, `billing_period_end` (nullable), `activation_method` (`manual` | `qhantuy`, default `manual`), `qhantuy_subscription_id` (nullable), `notes` (nullable), `created_at`, `updated_at`, `cancelled_at`.
- RLS: el negocio lee su propia fila; escritura solo `service_role` (la activación es manual por DB en este pass). GRANT SELECT a `authenticated`, ALL a `service_role`. Trigger `update_updated_at_column`.
- Backfill: insertar `basico`/`active`/`manual` para todo perfil business existente con `business_type` de comida.
- Trigger en `profiles` (insert/update de `business_type`/`is_business`) que crea la fila por defecto para negocios de comida nuevos, idempotente.

**`src/lib/subscriptionBilling.ts`** — único punto de integración de cobro, marcado con `// TODO(qhantuy)`: funciones stub `startSubscriptionCheckout(tier)` y `cancelSubscription()` que hoy solo muestran un mensaje de "contáctanos para activar tu plan". Al llegar los docs de Qhantuy solo se toca este archivo.

## Etapa 2 — Hook de gating y aplicación en la UI

**`src/hooks/useSubscriptionTier.ts`**: `useSubscriptionTier(businessId)` → `{ tier, status, isLoading, hasFeature(key) }`. Si no hay fila o el negocio no es de comida, cae a `basico` (y para negocios que no son de comida, `hasFeature` devuelve `true` para no romper nada existente). Query cacheada con react-query.

**Componente `LockedFeature`** (nuevo, en `src/components/subscriptions/`): envuelve el control, lo muestra atenuado y no interactivo, con etiqueta inline "Disponible en el plan Profesional/Elite" y un toque que abre el sheet de Planes.

Aplicación:
- `ReservationScheduleEditor.tsx`: sin `multi_shift`, el botón "Agregar turno" queda bloqueado cuando el día ya tiene un turno; sin `blackout_dates`, la sección de fechas bloqueadas queda bloqueada.
- `ReservationRulesEditor.tsx`: sin `covers_pacing`, bloquear `max_covers_per_interval`; sin `table_joining`, bloquear el switch "Unir mesas"; sin `full_reservation_policy`, bloquear "Cancelación (horas antes)" y "Tolerancia de llegada".
- `ReservasTab.tsx` (dashboard): sin `reservas_analytics_full`, mostrar solo las tarjetas de Reservas e Invitados y sustituir la tarjeta de Cancelación y el bloque "Días que más se llenan" por un estado bloqueado con CTA a Planes. "Próximas reservas" se mantiene.

## Etapa 3 — Pantalla de Planes

- Ruta `/settings/business/plans` con las tres tarjetas de plan, plan actual destacado, bullets por tier y precios (placeholder) en Bs.
- `PlansSheet` reutilizable (bottomsheet, `light-sheet`, `rounded-t-3xl`) que abren los candados, con el mismo contenido resumido y enlace a la ruta completa.
- Entrada en `BusinessSettings.tsx` ("Plan y facturación", visible solo para negocios de comida) mostrando el tier actual.
- El botón de cada plan llama a `subscriptionBilling` (hoy: mensaje de contacto), sin lógica de cobro.

## Notas técnicas / fricciones

- `useDirtyBaseline` en los editores de reservas compara el form completo: al bloquear campos hay que asegurarse de no mutar sus valores guardados, solo impedir su edición, para que no aparezcan cambios "sucios" falsos.
- `priority_placement` queda solo como feature key y bullet de marketing; no se toca el ranking de Discover/mapa en este pass.
- `venue_layout` y `city_insights` quedan reservados, sin lógica nueva.
- Los precios quedan como placeholders con TODO en `subscriptionTiers.ts` para que los llenes por código.
