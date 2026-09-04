# Admin panel: separar comisiones de suscripciones + pestaña Suscripciones

Hoy la página de Pagos mezcla los dos canales de ingreso: las órdenes de entradas/lounges/experiencias (donde Zentro gana 6%) y los pagos de suscripción de negocios (donde Zentro recibe el 100%). Las suscripciones se cuentan hoy como si dejaran solo un 6%, así que los totales no reflejan el ingreso real.

## 1. Separar los dos canales en Pagos

- En el resumen, dos bloques claramente distintos:
  - **Ventas (comisión Zentro 6%)**: volumen bruto, comisión Zentro, pagado a organizadores, órdenes, unidades, ticket promedio, comisión por entradas vs. experiencias vs. lounges.
  - **Suscripciones (100% Zentro)**: ingreso por suscripciones, cantidad de pagos, ticket promedio.
  - Una línea de **Ingreso total Zentro** = comisión 6% + suscripciones.
- La tabla de transacciones y "Top negocios" excluyen las suscripciones (pasan a la nueva pestaña); se agrega el tipo "Lounge" a la columna Tipo.
- El resumen general (Overview) usa el mismo criterio para que los números coincidan.

## 2. Nueva pestaña "Suscripciones"

Nueva entrada en el menú lateral del admin, con:

- Tarjetas de resumen: activas, por vencer en 30 días, en gracia/vencidas, canceladas, ingreso del periodo, MRR estimado.
- Filtros por estado (activa, pendiente, en mora, cancelada) y por plan (Básico, Profesional, Elite), más buscador por negocio.
- Lista de negocios suscritos con: negocio (nombre y usuario), plan, mensual/anual, estado, fecha de alta, inicio y fin del periodo, días restantes hasta la renovación, método de activación (manual o pago), monto pagado y último pago.
- Historial de pagos de suscripción por negocio al abrir una fila.
- Exportar CSV.
- Barra de acciones por fila preparada pero sin efecto todavía (marcador de posición): las acciones concretas las definimos después. Si quieres, empiezo con dos obvias: extender/renovar manualmente y cancelar.

## Detalles técnicos

- Edge function `admin-api`:
  - `payments`: separar `payment_sessions` con `subscription_business_id` del resto; devolver `summary.sales` y `summary.subscriptions` por separado y excluir suscripciones de `transactions`/`topBusinesses`; comisión de suscripción = monto total.
  - `overview`: mismo split en `sales`.
  - Nueva acción `subscriptions`: join de `business_subscriptions` con `profiles` y con los `payment_sessions` de suscripción (tier, interval, monto, fecha) para agregados y detalle.
- Frontend: `useAdminApi.ts` (tipos + `useAdminSubscriptions`), `AdminPayments.tsx` (dos secciones de resumen), nueva `AdminSubscriptions.tsx`, ruta en `App.tsx` y enlace en `AdminLayout.tsx`.
- Sin cambios de esquema ni de lógica de cobro; solo lectura y presentación.
