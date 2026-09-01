# Cobro recurrente automático de los planes con Stripe Billing

Los planes de negocio (Profesional / Premium) pasan a cobrarse solos cada mes o cada año con tarjeta, como en cualquier app. Qhantuy sigue igual para entradas, reservas y experiencias — no se toca nada de eso.

El QR de Qhantuy para planes **no se elimina**: queda como segunda opción para los negocios que no tienen tarjeta habilitada para pagos internacionales, que en Bolivia es un caso real y frecuente.

## Cómo lo va a vivir el negocio

1. En "Planes" elige Profesional o Premium y mensual o anual (anual mantiene el 5% de descuento).
2. Ve dos formas de pago: **Tarjeta (renovación automática)** — recomendada — y **QR Qhantuy (pago manual cada período)**.
3. Con tarjeta va a un checkout de Stripe, paga, vuelve a la app y el plan queda activo al instante.
4. A partir de ahí se renueva solo. En "Mi plan" ve la fecha de próxima renovación y un botón **Gestionar suscripción** que abre el portal de Stripe para cambiar tarjeta, cambiar de plan o cancelar sin escribir a soporte.
5. Si una tarjeta falla, el plan entra en período de gracia (lo que ya existe hoy) mientras Stripe reintenta, y se avisa por correo.

## Qué se construye

**Productos y precios en Stripe**
- 4 precios recurrentes: Profesional mensual, Profesional anual, Premium mensual, Premium anual, con los importes actuales en Bs. y el 5% de descuento anual ya aplicado en el precio anual.
- Los `price_id` quedan escritos en el código junto a la definición de tiers, y cada tier guarda su `price_id` y `product_id`.
- Al crearlos se confirma que la cuenta de Stripe puede cobrar en BOB; si no, se cobra el equivalente en USD y en la app se sigue mostrando el precio en Bs. como referencia.

**Backend**
- Nueva función `create-subscription-checkout`: valida el JWT, reutiliza o crea el cliente de Stripe con el email del usuario, guarda `stripe_customer_id` en `profiles` (la columna ya existe) y devuelve la URL del checkout en modo `subscription`.
- Nueva función `subscription-portal`: devuelve la URL del portal de cliente de Stripe para el negocio autenticado.
- Se amplía la función `stripe-webhook` que ya existe (hoy maneja los pagos de anuncios) para atender los eventos de suscripción: alta, renovación cobrada, pago fallido, cancelación y cambio de plan, escribiendo siempre sobre la misma tabla `business_subscriptions` con las funciones de activación que ya usa Qhantuy.

**Base de datos**
- Se agregan a `business_subscriptions` columnas nuevas y opcionales: `stripe_subscription_id`, `stripe_price_id` y `auto_renew`, y se admite `'stripe'` como `activation_method`. No se borra ni se renombra nada, así que las suscripciones actuales por QR siguen funcionando exactamente igual.

**Frontend**
- `subscriptionBilling.ts` gana el camino de tarjeta junto al de QR; el gating (`useSubscriptionTier`, `LockedFeature`) no cambia en absoluto.
- En el sheet de confirmación de plan se elige método de pago.
- En la pantalla del plan: estado de renovación automática, próxima fecha de cobro y botón "Gestionar suscripción". `cancelSubscription`, que hoy solo muestra un mensaje pidiendo escribir a soporte, pasa a abrir el portal cuando la suscripción es de Stripe.
- Correos de bienvenida, cobro exitoso y pago fallido reutilizando `send-subscription-emails`.

## Notas técnicas

- El proyecto ya tiene Stripe conectado con clave propia (cuenta "Zentro") y una función `stripe-webhook` en producción para los boosts de anuncios; esto se monta sobre esa misma integración, sin habilitar un proveedor de pagos nuevo.
- El cron diario `subscription-lifecycle` sigue mandando para las suscripciones por QR; para las de Stripe el estado lo manda el webhook y el cron las ignora.
- El 6% de comisión de eventos no se toca: es de Qhantuy y aplica solo a entradas y reservas.
- Riesgo a validar en la primera prueba real: que las tarjetas bolivianas de los negocios acepten el cobro. Por eso el QR se mantiene visible como alternativa en lugar de sustituirse.
