# Embudo de conversión: hacer que todas las etapas respeten el período

## Estado actual (verificado en el código y la base)

| Etapa | Fuente | ¿Respeta el período? |
|---|---|---|
| Impresiones | `event_stats.impression_count` (contador acumulado) | No — siempre histórico |
| Vistas detalle | `event_stats.view_count` (contador acumulado) | No — siempre histórico |
| Tap "Comprar" | `event_interactions` tipo `checkout_tap`, filtrado por `created_at` | Sí |
| Checkout iniciado | `payment_sessions` del evento, filtrado por `created_at` | Sí |
| Compras | `payment_sessions` con `status = 'confirmed'` | Sí |

Es decir: las tres etapas de abajo son correctas para 7d/30d, pero las dos de arriba son acumuladas desde la publicación. Hoy eso se advierte con una nota al pie, pero igual deja tasas engañosas: "Vista → Comprar" y "Conversión total" dividen números del período entre números históricos, así que con 7d salen artificialmente bajas.

Dos detalles adicionales confirmados:
- "Compras" solo cuenta pagos confirmados. Entradas gratis o invitaciones especiales no aparecen como compra (correcto para un embudo de venta, pero conviene saberlo).
- "Checkout iniciado" cuenta toda sesión de pago creada (pendiente, expirada o confirmada), que es la lectura correcta de esa etapa.

## Qué se construye

### 1. Rollup diario de impresiones y vistas
Nueva tabla `event_stats_daily (event_id, day, impressions, views)` con clave primaria `(event_id, day)`. La función que ya consume la cola de impresiones (`ingest-impressions`) hace un `INSERT ... ON CONFLICT DO UPDATE` sobre la fila del día además de seguir actualizando el contador acumulado de `event_stats`. Volumen: una fila por evento por día, sin costo por usuario.

### 2. El embudo lee del rollup cuando hay período
`useConversionFunnel` suma `event_stats_daily` filtrado por `day >= inicio del período` para 7d/30d, y usa los contadores acumulados de `event_stats` solo en "Todo". Así las cinco etapas y las tres tasas quedan en la misma ventana de tiempo.

### 3. Retrocompatibilidad honesta
Los días anteriores a la migración no existen en el rollup. Mientras la ventana seleccionada incluya fechas previas al inicio del registro diario, se muestra una nota discreta: "Impresiones y vistas disponibles desde el DD/MM". Una vez pasados 30 días desde la migración, la nota desaparece sola y se elimina la advertencia actual de datos acumulados.

## Detalles técnicos

- Migración: `CREATE TABLE public.event_stats_daily` con GRANTs (`SELECT` a `authenticated`, `ALL` a `service_role`), RLS y política de lectura para el creador del evento; índice por `(event_id, day)`.
- Edge function `ingest-impressions`: un upsert extra por lote (agrupado por evento y día), sin round-trips adicionales por evento individual.
- `src/hooks/useConversionFunnel.ts`: rama por período (rollup vs. contador acumulado) y cálculo de la fecha de inicio de datos disponibles.
- `src/components/dashboard/ConversionFunnel.tsx`: reemplazar la nota fija por la nota condicional.
- Sin cambios en las etapas de tap/checkout/compra, que ya son correctas.
