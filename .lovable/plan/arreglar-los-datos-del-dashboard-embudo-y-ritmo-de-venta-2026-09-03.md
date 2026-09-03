# Arreglar los datos del dashboard (embudo y ritmo de venta)

Revisé la base de datos real. Hay dos fallas confirmadas y dos problemas de exactitud que también conviene corregir.

## Lo que está roto (verificado en datos)

**1. El tap en "Comprar" nunca se guarda.**
La tabla `event_interactions` tiene una restricción que solo permite los tipos `view, impression, join, checkin, share, scroll_past, save, like, repost, click, not_interested, dwell`. El tipo `checkout_tap` no está en la lista, así que cada intento de registro es rechazado por la base de datos y el código lo descarta en silencio (`try/catch`). Hoy hay **0 filas** de `checkout_tap` en toda la base.
Consecuencia directa: la etapa `Tap "Comprar"` siempre en 0, y la tasa `Vista → Comprar` siempre 0%.

**2. "Ritmo de venta" ignora los lounges y las entradas sin cupo.**
`useSalesPace` calcula todo desde `ticket_tiers.sold_count` / `capacity`. En tu evento de prueba: el tier tiene `sold_count = 0` y `capacity = NULL`, y la única venta real fue un **lounge** (`area_bookings` confirmado, Bs. 10). Los lounges no entran en ese cálculo, por eso ves `0 vendidos · 0%`.

## Problemas de exactitud que aparecieron al revisar

**3. Los pagos de tu propia suscripción se cuentan como ingresos del negocio.**
`useSalesOverview` suma todos los `payment_sessions` confirmados con `business_user_id = tu usuario`, sin excluir los de suscripción (`event_id` nulo, `subscription_tier` presente). Hay un cobro de suscripción de Bs. 250 confirmado que hoy se está sumando a "Ingresos" del dashboard.

**4. "Tickets vendidos" cuenta el tamaño del grupo de un lounge como tickets.**
Una reserva de lounge con `party_size = 18` suma 18 tickets, lo que infla el conteo y distorsiona el ticket promedio.

## Qué se va a hacer

1. **Migración**: ampliar la restricción de `event_interactions.type` para incluir `checkout_tap` (y un índice por `(event_id, type, created_at)`). Con esto la etapa empieza a registrar desde el primer tap.
2. **Registro visible de errores**: que `trackCheckoutTap` deje de fallar en silencio (log de error), para que un rechazo futuro no pase inadvertido.
3. **Ritmo de venta**: sumar la ocupación de lounges (`event_areas` + `area_bookings` confirmados) junto a los tiers, y mostrar eventos aunque no tengan tiers. Cuando la capacidad es nula/0, mostrar solo el número vendido sin barra ni porcentaje (en vez de un 0% engañoso).
4. **Ingresos**: excluir de `useSalesOverview` los `payment_sessions` de suscripción (`subscription_tier` no nulo o `event_id` nulo), para que el dashboard muestre solo ventas a clientes.
5. **Tickets vendidos**: contar por `quantity` para tiers y como 1 unidad por reserva de lounge, en lugar de `party_size`.
6. **Embudo**: contar las compras por sesiones confirmadas de tiers y lounges por separado y mostrar "–" en lugar de "0,0%" cuando la etapa base es cero, para distinguir "sin datos" de "conversión nula".

## Detalles técnicos

- Migración nueva: `ALTER TABLE public.event_interactions DROP CONSTRAINT event_interactions_type_check` + recrearla con `checkout_tap`; índice parcial para el embudo. El trigger `guard_event_interactions` no requiere cambios (solo bloquea `impression`/`view`).
- Editar `src/lib/analyticsTracking.ts` (log del error), `src/hooks/useSalesOverview.ts` (filtro de suscripciones, tickets, pace con lounges), `src/hooks/useConversionFunnel.ts` (compras y bases), `src/components/dashboard/SalesPaceSection.tsx` y `ConversionFunnel.tsx` (estados sin datos).
- Sin cambios en el flujo de compra ni en pagos.

Nota: las impresiones y vistas sí están llegando (`event_stats`: 7 impresiones, 1 vista en el evento de prueba), así que esas dos etapas ya son reales; los números son pequeños simplemente porque el evento es de prueba.
