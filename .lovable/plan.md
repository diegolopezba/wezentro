# Cobro de planes con QR de Qhantuy (mensual o anual con 5% off)

Conectar los planes Básico / Profesional / Premium al sistema de pago real: el negocio elige plan y ciclo (mensual o 12 meses con 5% de descuento), paga con QR de Qhantuy, y al confirmarse el pago se activa el plan automáticamente. Todo el cobro va 100% a la cuenta de Zentro (no hay organizador que reciba parte).

## Cómo funciona

1. En Planes, el negocio elige plan y ciclo (Mensual / Anual −5%).
2. Se abre un bottomsheet con el QR (mismo estilo que la compra de entradas) y el monto.
3. Al pagar, el callback de Qhantuy activa el plan y fija el período de facturación.
4. Al vencer: 3 días de gracia con las funciones activas y avisos; después se bloquea hasta que pague.
5. Recordatorios de renovación por email + notificación in-app a 7, 3 y 1 día antes.
6. Subir de plan a mitad de ciclo: se cobra solo la diferencia prorrateada por los días restantes y se mantiene la fecha de renovación.

Precios: Básico Bs. 250, Profesional Bs. 300, Premium Bs. 500 al mes. Anual = 12 meses × precio × 0.95 (Bs. 2.850 / 3.420 / 5.700).

## Datos

`business_subscriptions` — nuevas columnas:
- `billing_interval` ('month' | 'year', default 'month')
- `grace_until` (timestamptz) — vencimiento + 3 días
- `last_payment_session_id`, `amount_paid_bob`, `auto_renew` (informativo: hoy la renovación es por QR manual)
- `reminders_sent` (jsonb) para no repetir avisos

`payment_sessions` — nuevas columnas:
- `subscription_business_id`, `subscription_tier`, `subscription_interval`
Esto permite reutilizar toda la infraestructura de QR/callback ya existente sin tocar el flujo de entradas ni de experiencias.

Nueva función SQL `activate_business_subscription(business_id, tier, interval, session_id, amount)`: calcula el nuevo período (extiende desde el fin actual si todavía está vigente, o desde hoy si venció), setea `status='active'`, `grace_until`, `activation_method='qhantuy'`. Idempotente por `payment_session_id`.

## Backend

- **Nueva edge function `generate-subscription-qr`**: valida sesión, valida que el negocio sea de comida, calcula el monto (mensual, anual con 5%, o diferencia prorrateada si es upgrade), crea el `payment_sessions` marcado como suscripción, y llama al checkout de Qhantuy con `custom_payouts` de una sola línea al beneficiario de Zentro (`QHANTUY_PLATFORM_BENEFICIARY_CODE`) por el 100%.
- **`qhantuy-callback`**: nueva rama antes de la lógica de entradas — si la sesión tiene `subscription_business_id`, llama a `activate_business_subscription`, crea notificación "Plan activado" y dispara el email de comprobante. No toca guestlist ni experiencias.
- **`check-qhantuy-payment-status`**: reconocer sesiones de suscripción y devolver el estado para que el sheet cierre solo al confirmarse.
- **Nueva edge function `subscription-lifecycle`** + cron diario: marca `past_due` al vencer, `cancelled` (o sea, vuelta a bloqueado) al pasar la gracia de 3 días, y envía los recordatorios de 7/3/1 días con email + notificación in-app.
- Email transaccional nuevo: comprobante de pago del plan y recordatorio de renovación (usando la infraestructura de `send-transactional-email`).

## Frontend

- `src/lib/subscriptionTiers.ts`: agregar `yearlyPrice(tier)` y el 5% de descuento como constante.
- `PlanSelector`: selector Mensual / Anual (con badge "Ahorrá 5%"), precios que cambian según el ciclo.
- `PlanConfirmSheet`: reemplazar el mensaje de "escribinos" por el resumen real (plan, ciclo, monto, prorrateo si aplica) y el botón "Pagar con QR".
- Nuevo `SubscriptionQRSheet`: mismo patrón visual que el QR de entradas (QR, monto, polling de estado, éxito con "Plan activado").
- `src/lib/subscriptionBilling.ts`: pasa de stubs a las llamadas reales (`generate-subscription-qr`, polling de estado). Sigue siendo el único archivo que sabe de cobro.
- `BusinessPlans.tsx`: mostrar plan actual, ciclo, fecha de renovación, aviso de vencimiento/gracia y botón "Renovar ahora"; "Cambiar o cancelar" pasa a ser cambio de plan con prorrateo y cancelación (no renovar).
- `useSubscriptionTier`: tratar `past_due` dentro de la gracia como acceso completo y bloquear después.
- Banner discreto en el dashboard cuando falten ≤7 días o esté en gracia.

## Notas

- La activación manual por base de datos sigue funcionando (`activation_method='manual'`), útil para cortesías.
- Qhantuy no cobra automáticamente: la "suscripción" es un ciclo con vencimiento + recordatorios + QR de renovación. Si más adelante Qhantuy habilita débito recurrente, solo cambia `subscription-lifecycle`.
- La comisión del 6% de entradas no se toca; el pago del plan es aparte y va entero a Zentro.
