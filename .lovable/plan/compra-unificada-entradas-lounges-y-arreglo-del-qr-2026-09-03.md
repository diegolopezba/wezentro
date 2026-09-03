# Compra unificada (entradas + lounges) y arreglo del QR

## 1. Una sola pantalla de compra con todas las categorías

Hoy el botón "Comprar" prioriza las áreas: si el evento tiene plano, abre el plano y nunca muestra los tipos de entrada, aunque existan.

Qué se hará:

- Al tocar "Comprar" se abre **una sola hoja** con todo lo que está a la venta en ese evento, sin pasos intermedios:
  - Sección "Entradas": cada tier con nombre, precio, disponibilidad y estado (agotado / bloqueado por acceso anticipado).
  - Sección "Áreas / Lounges": según cómo esté configurado el evento, el **mapa visual** del plano o la **lista** de áreas, con precio, capacidad y entradas incluidas.
- Tocar un tier lleva directo al pago; tocar un área la reserva (hold) y lleva al pago, igual que hoy.
- Si el evento solo tiene entradas, o solo áreas, se muestra únicamente esa sección (sin encabezados innecesarios).
- El precio de la barra inferior pasa a ser el mínimo entre tiers y áreas ("Desde Bs. X").

## 2. Error "No se pudo generar el QR"

Causa confirmada en los logs de Qhantuy: *"El monto es insuficiente para cubrir la distribución a los beneficiarios más la comisión aplicable."* Los `custom_payouts` reparten el 100% del cobro (94% organizador + 6% Zentro), así que no queda nada para la comisión de Qhantuy.

Solución elegida: cobrar la comisión de Qhantuy en modo **PRE_CHARGE**, es decir, el 1% se suma al monto que paga el comprador. Así:

- Organizador: 94% del precio base.
- Zentro: 6% del precio base.
- Qhantuy: 1% adicional, pagado por el comprador.

Qué se hará:

- Enviar a Qhantuy el indicador de comisión pre-cobrada y calcular el total como `precio base × 1.01` (tasa configurable por variable de entorno).
- Mostrar, antes de pagar, un **resumen claro**: subtotal, "Fee (1%)" y total a pagar. Aplica en el checkout de entradas/áreas, experiencias y suscripciones.
- Guardar en `payment_sessions` el monto base, la comisión del gateway y el total, para que el dashboard siga mostrando el neto real del organizador (sin inflar ingresos con la comisión).
- Reemplazar el error genérico de Qhantuy por un mensaje entendible si el monto sigue siendo insuficiente (precio mínimo).

## Detalles técnicos

- `src/hooks/useEventDetailState.ts`: `handleBuyTicket` abre siempre la hoja unificada cuando hay tiers y/o áreas; `formattedPrice` considera ambos.
- Nuevo `src/components/events/PurchaseSheet.tsx` que reutiliza `TicketTierPicker` y `AreaPickerSheet`/`VenueGridCanvas` como secciones internas; montado en `EventDetail.tsx` y `EventDetailModal.tsx`.
- `supabase/functions/_shared/qhantuy.ts`: nueva función de cálculo con comisión de gateway pre-cobrada (`QHANTUY_GATEWAY_FEE_BPS`, default 100) y payouts que suman el precio base; el total enviado incluye la comisión.
- Actualizar `generate-qhantuy-qr`, `generate-experience-qr`, `generate-subscription-qr` y el desglose que devuelven al cliente (subtotal / fee / total) para el resumen de pago en `PaymentQRModal` y equivalentes.
- Redeploy de las tres funciones y prueba real con un área de Bs. 10 revisando logs.
- Se registra la tarea en `roadmap.md`. Sin cambios de esquema salvo columnas nuevas opcionales en `payment_sessions` para el desglose de la comisión del gateway.