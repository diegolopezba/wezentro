# Embudo de conversión (Overview + por evento)

Sí, tiene sentido — pero hoy falta una pieza de datos y hay un límite real que conviene saber antes de construirlo.

## Qué se puede medir hoy

| Etapa | Fuente | Estado |
|---|---|---|
| Impresiones (vista en el feed/descubrir) | `event_stats.impression_count` | Existe, pero **solo total histórico** (sin fecha) |
| Vistas del detalle | `event_stats.view_count` | Existe, mismo límite |
| Tap en "Comprar" | — | **No se registra hoy** |
| Checkout iniciado (QR generado) | `payment_sessions` (`pending` + `confirmed`) | Existe, con fecha |
| Compra confirmada | `payment_sessions.status = 'confirmed'` | Existe, con fecha |

Dos hallazgos que condicionan el diseño:

1. Impresiones y vistas ya no se guardan fila por fila (un trigger las bloquea para ahorrar costos de base de datos); solo viven como contadores acumulados por evento. Por eso el embudo completo será **histórico por evento**, no filtrable por 7/30 días. Las etapas de checkout y compra sí respetan el selector de período.
2. El tap en "Comprar" no se registra en ningún lado, así que hay que agregarlo.

## Qué se construye

### 1. Registrar el tap en "Comprar"
Nuevo tipo de interacción `checkout_tap`, disparado al abrir el modal de pago desde el detalle del evento (página y overlay), tanto en compra pagada como en unirse gratis. Se guarda con fecha, así que esta etapa sí es filtrable por período.

### 2. Embudo en Overview
Bloque nuevo "Embudo de conversión" debajo de las tarjetas de ingresos, con barras horizontales:

```text
Impresiones      12.480  ────────────────────────  100%
Vistas detalle    2.310  ─────                      18,5%
Tap "Comprar"       540  ─                           4,3%
Checkout iniciado   310  ▪                           2,5%
Compras             196  ▪                           1,6%
```

Debajo, tres tasas clave:
- **Vista → Comprar** (interés)
- **Checkout → Compra** (fricción de pago; la más accionable)
- **Conversión total** (impresión → compra)

### 3. Embudo por evento
En la tarjeta de cada evento en la pestaña **Ventas** se agrega la conversión total, y al tocar el evento se muestra el mismo embudo de 5 etapas para ese evento específico.

### 4. Aviso de datos
Etiqueta discreta indicando que impresiones y vistas son acumuladas desde la publicación del evento, para que los números no se lean mal junto al selector de período.

## Detalles técnicos

- Nuevo hook `useConversionFunnel(eventId?)`: lee `event_stats` (impresiones/vistas), cuenta `event_interactions` de tipo `checkout_tap`, y agrupa `payment_sessions` por estado, filtrado por los eventos del creador.
- Migración: permitir `checkout_tap` en `event_interactions` (el trigger actual solo bloquea `impression`/`view`, así que no requiere cambio del trigger) e índice por `(event_id, type, created_at)` si hace falta.
- Nuevo componente `src/components/dashboard/ConversionFunnel.tsx`, reutilizado en Overview y en el detalle de evento.
- Nuevo tracking en `src/lib/analyticsTracking.ts` (`trackCheckoutTap`), llamado desde `useEventDetailState.ts` al abrir el checkout.
- Volumen bajo (un insert por tap real), sin impacto de costos comparable a impresiones.

## Opcional (dímelo si lo quieres)
Volver a registrar impresiones/vistas con fecha por evento (tabla diaria agregada, no fila por usuario) para que el embudo completo sea filtrable por período sin recuperar el costo anterior.
