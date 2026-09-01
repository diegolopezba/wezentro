# Plan activo con countdown de renovación en Business Settings

Mostrar una tarjeta compacta "Tu plan" en la página de Business settings (`/settings/business`) para negocios de comida con plan activo, con los días restantes hasta la renovación.

## Componente nuevo: `src/components/business/PlanStatusCard.tsx`

- Usa `useSubscriptionTier(user.id)` — ya expone `tier`, `tierConfig`, `status`, `renewsOn` (billing_period_end), `billingInterval`, `inGracePeriod`, `graceUntil`, `subscription.amount_paid_bob`. No hace falta tocar el hook ni la base de datos.
- Contenido de la tarjeta (mismo estilo de `SettingsGroup`/card monocromo actual):
  - Nombre del plan ("Plan Profesional") con badge del tier.
  - Countdown: días restantes calculados como `ceil((billing_period_end - hoy) / 86400000)`.
    - Más de 7 días: "Se renueva en 23 días" (texto normal) + fecha exacta ("12 de oct").
    - 3–7 días: texto de advertencia "Vence en 5 días — renová para no perder funciones".
    - `past_due` (grace): "Venció — te quedan X días de gracia" calculado desde `grace_until`.
    - Sin `billing_period_end` (activación manual sin período): solo muestra el plan, sin countdown.
  - Botón pill "Renovar / Ver planes" que navega a `/settings/business/plans`.
- Intervalo anual muestra "Plan anual" junto al nombre.

## Integración en `BusinessSettings.tsx`

- La tarjeta se renderiza arriba del grupo "Funciones", solo si `isFoodBusiness` y hay una fila de suscripción con status `active` o `past_due` (un negocio que nunca pagó no ve la tarjeta; sigue viendo el checklist "Activá tu plan" y la fila "Plan y facturación" existente).
- La fila "Plan y facturación" existente se mantiene.

## Notas técnicas

- Sin migraciones ni cambios de backend: toda la data ya existe en `business_subscriptions` y ya la lee el hook (owner la lee bajo RLS propio).
- El countdown se calcula client-side en `es-BO` para la fecha; no requiere re-render en tiempo real (se calcula al montar).
- Borde de color sutil (ámbar/rojo suave vía tokens semánticos) solo cuando quedan ≤7 días o está en gracia; el resto es monocromo estándar.
