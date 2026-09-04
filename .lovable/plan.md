# Panel admin: ingresos de suscripciones + acciones activar/detener

## Qué está pasando con "Canal 2 = 0"

La respuesta que el panel está recibiendo en la pestaña de pagos todavía es la versión anterior: su resumen no trae los campos de suscripciones y, peor aún, cuenta el pago de suscripción de Bs. 250 como si fuera una venta de entradas (aparece dentro de "ventas" con comisión de Bs. 250). En cambio, la pestaña de Suscripciones sí responde con datos nuevos y correctos (4 negocios suscritos, 1 pago confirmado de Bs. 250).

Es decir: la lógica nueva ya está escrita, pero la función que atiende la pestaña de pagos quedó desactualizada en el servidor. Además el número correcto existe en la base: hay un pago confirmado de Bs. 250 del 1 de septiembre.

## Qué haré

1. Volver a publicar la función del panel de administración y comprobar, con una llamada real, que la respuesta de pagos ya trae:
   - Canal 1 (ventas): sin el pago de suscripción, con comisión del 6% correcta.
   - Canal 2 (suscripciones): Bs. 250 y 1 pago en el periodo de 30 días.
2. Si tras publicar sigue mostrando 0, revisar el cálculo del periodo y la clasificación de la sesión de suscripción hasta que el número coincida con la base de datos.

## Botones de acción en "Negocios suscritos"

En cada fila de la lista de suscripciones habrá acciones reales (hoy están deshabilitadas):

- **Activar / Reactivar** — pone la suscripción en activa y, si no tiene periodo vigente, le fija un ciclo desde hoy según su cadencia (mes o año).
- **Detener (cancelar)** — pasa la suscripción a cancelada, con confirmación previa. El negocio pierde el acceso a las funciones del plan.
- **Marcar como vencida (past_due)** — opción secundaria para suspender temporalmente sin cancelar del todo.
- **Extender 30 días** — mueve la fecha de renovación hacia adelante (útil para cortesías o pagos fuera de la app).
- **Cambiar plan** — dejar el botón como está por ahora (pendiente de definir).

Cada acción pide confirmación cuando es destructiva, muestra un aviso de éxito o error y refresca la lista al instante.

## Detalles técnicos

- `supabase/functions/admin-api/index.ts`: agregar la acción `subscription_update` (validada con Zod) que acepta `{ subscriptionId, op: 'activate' | 'cancel' | 'past_due' | 'extend', days? }`, verifica rol admin igual que las demás acciones, y actualiza `business_subscriptions` con `status`, `billing_period_start/end`, `grace_until`, `cancelled_at`, `notes` (registro de acción manual). Los estados permitidos por el CHECK son `active`, `pending_activation`, `past_due`, `cancelled`.
- Redeploy de `admin-api` y verificación de la respuesta de la acción `payments` (debe incluir `subscriptionRevenue`, `subscriptionPayments`, `totalRevenue` y excluir sesiones con `subscription_business_id`).
- `src/hooks/useAdminApi.ts`: nuevo `useAdminSubscriptionAction` (mutación) que invalida las queries `admin:subscriptions` y `admin:payments`.
- `src/pages/admin/AdminSubscriptions.tsx`: reemplazar los botones deshabilitados por un menú de acciones con diálogo de confirmación y estados de carga.
- Sin migraciones ni cambios en la lógica de cobros.
