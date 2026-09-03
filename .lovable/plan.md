# Arreglar compra cuando hay entradas y lounges + error de QR

Dos problemas confirmados en la prueba.

## 1. "Comprar" salta directo a lounges

Hoy el botón de compra prioriza las áreas: si el evento tiene áreas, abre el plano y nunca muestra las entradas generales, aunque existan tiers activos.

Qué se hará:
- Al tocar "Comprar", si el evento tiene **ambos** (tiers vendibles y áreas vendibles), abrir primero un selector de categoría (bottom sheet claro) con dos opciones:
  - "Entradas" — cantidad de tipos disponibles y precio desde.
  - "Lounges / Áreas" — cantidad de áreas disponibles y precio desde.
- Elegir "Entradas" abre el selector de tiers actual (o salta directo al pago si hay un solo tier / modo secuencial).
- Elegir "Lounges" abre el plano visual actual (AreaPickerSheet).
- Si solo hay tiers, o solo hay áreas, el comportamiento actual se mantiene sin pasos extra.
- El precio mostrado en la barra de compra pasa a considerar tiers **y** áreas (el "Desde Bs. X" más bajo entre ambos).

## 2. Error "No se pudo generar el QR"

Causa confirmada en los logs: Qhantuy rechazó el checkout con *"El monto es insuficiente para cubrir la distribución a los beneficiarios más la comisión aplicable."* al comprar un área de Bs. 10.

El problema no es del área: hoy los `custom_payouts` suman **exactamente el total cobrado** (94% organizador + 6% Zentro), por lo que no queda margen para la comisión que Qhantuy cobra sobre la transacción. Con montos bajos, Qhantuy rechaza la operación.

Qué se hará:
- Reservar la comisión de Qhantuy antes de repartir: los payouts sumarán `total − comisión Qhantuy`, y esa comisión se descuenta de la parte de Zentro (el organizador sigue recibiendo su 94%).
- Hacer configurables la tasa y el mínimo de esa comisión (variables de entorno, con valores por defecto de 1% y mínimo Bs. 1) para poder ajustarlas sin volver a desplegar.
- Si tras reservar la comisión la parte de Zentro quedara negativa, se recorta a cero (el organizador nunca pierde su parte) y se registra un aviso en logs.
- Añadir un monto mínimo de venta con mensaje claro ("El precio mínimo para cobrar es Bs. X") tanto al crear áreas/tiers como en el checkout, en vez del error genérico de QR.
- Aplicar el mismo cálculo en los tres flujos de cobro: entradas/áreas, experiencias y suscripciones.

## Detalles técnicos

- `src/hooks/useEventDetailState.ts`: nuevo estado `showPurchaseTypePicker`; `handleBuyTicket` decide entre picker de categoría, tiers o áreas; `formattedPrice` incluye áreas.
- Nuevo `src/components/events/PurchaseTypePicker.tsx`, montado junto a `TicketTierPicker` y `AreaPickerSheet` en `EventDetail.tsx` y `EventDetailModal.tsx`.
- `supabase/functions/_shared/qhantuy.ts`: `splitAmount`/`platformPayouts` reservan la comisión del gateway (`QHANTUY_GATEWAY_FEE_BPS`, `QHANTUY_GATEWAY_FEE_MIN`) y exponen un mínimo de monto.
- Redeploy de `generate-qhantuy-qr`, `generate-experience-qr`, `generate-subscription-qr`; verificación con un checkout real de bajo monto y revisión de logs.
- Sin cambios de esquema en la base de datos.
