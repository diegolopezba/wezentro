# Pestaña "Entradas" con el detalle completo (Gestión › Eventos)

## Qué cambia
Hoy la pestaña Entradas solo lista los tipos de entrada configurados, y se basa en un contador interno que se queda corto (por ejemplo, Cábala muestra unas 48 cuando en realidad hay más de 150). Se reemplaza por un detalle completo armado a partir de las entradas emitidas de verdad.

### 1. Total arriba
Una tarjeta con **Total de entradas emitidas**, que coincide con el número de la cabecera del evento, y debajo el desglose: pagadas · en puerta · invitados.

### 2. Vendidas por categoría
Una fila por cada categoría, con cantidad, precio, ingresos y barra de capacidad (se mantienen los colores de Agotado y Casi agotado):
- Cada tipo de entrada y cada fase (Fase 1, Fase 2, General, VIP…)
- **Precio único**: las ventas hechas antes de configurar tipos, o en eventos que tienen un solo precio
- **Ventas en puerta**: agrupadas por el nombre de cada entrada de puerta
- **Lounges**: las entradas que vienen incluidas en reservas, si las hay

### 3. Invitados
- Invitaciones especiales **enviadas**, **aceptadas**, pendientes y revocadas
- Invitados de la lista que se agregaron a mano (cortesías)
- Cuántos invitados ya ingresaron

Las entradas que ya se usaron se muestran en cada fila como "X ingresaron".

## Detalles técnicos
- Nueva función `get_event_entry_breakdown(_event_id)` (security definer, solo para el dueño del evento o sus colaboradores) que agrupa `guestlist_entries` (aprobadas o con check-in) por origen: `ticket_tier_id` → tipo de entrada; sesión con `is_gate_sale` → `gate_offer_name`; `area_booking_id` → lounge; `is_special_guest` → invitación especial; sin sesión ni tipo de entrada → cortesía manual; sesión pagada sin tipo de entrada → "Precio único". Los ingresos salen de `payment_sessions.base_amount` confirmados. Así se dejan de usar `ticket_tiers.sold_count` y `get_event_ticket_breakdown` en esta pantalla.
- Los conteos de invitaciones salen de `event_special_invites` agrupados por `status` (pending/redeemed/revoked); el total es lo enviado.
- El total se valida para que coincida con `get_creator_sales_by_event` (cabecera). Lo verifico con Cábala y BRUNCH RAVE.
- Se reescribe `EventTiersPanel.tsx` y se agrega un hook nuevo en `usePromoters.ts`. No se tocan los cobros ni el escáner.
