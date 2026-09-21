# Plan: mostrar el plan real en el panel de administración

## Problema
Cada cuenta Business nueva recibe una fila automática en `business_subscriptions` con tier `basico` y estado `pending_activation` (marcador de "sin plan activado"). El admin muestra esa fila tal cual, entonces la columna Plan dice "basico (pending_activation)" para negocios que en realidad están en el plan gratis. Datos actuales: 16 negocios `basico/pending_activation`, 4 `basico/active`.

## Qué se va a construir
Hacer que la columna Plan del admin refleje la realidad:

1. **Panel admin — Negocios** (`admin-api` función `businesses()` + `AdminBusinesses.tsx`):
   - Si la suscripción está en `pending_activation` (o no existe fila), la columna muestra **"Gratis"**.
   - Si está `active`, muestra el nombre del plan: "Básico", "Profesional" o "Elite".
   - Si está `past_due` o `cancelled`, muestra el plan con la etiqueta correspondiente ("Básico (vencido)", etc.).
2. **Panel admin — Suscripciones** (`AdminSubscriptions.tsx`): el filtro "Pendientes" se renombra a "Sin activar" para que quede claro que son cuentas gratis que nunca pagaron, no pagos por procesar.
3. Sin cambios en la base de datos ni en la lógica de suscripciones: la fila `pending_activation` se sigue creando igual (la usa el sistema para saber que el negocio no tiene plan), solo cambia cómo se muestra en el admin.

## Detalles técnicos
- Editar `supabase/functions/admin-api/index.ts` (`businesses()`): devolver un campo `planLabel` ya resuelto en el servidor, manteniendo `tier`/`subscriptionStatus` crudos para otros usos.
- Editar `src/pages/admin/AdminBusinesses.tsx`: renderizar `planLabel`.
- Editar `src/pages/admin/AdminSubscriptions.tsx`: solo textos de etiquetas.
- Redeploy de `admin-api` y verificación con una consulta real del listado de negocios.
