# Gatear menú y reservas detrás del plan (y cerrar el hueco al activar Business)

## Qué está pasando hoy

Verificado en la cuenta `lalalalo`: `is_business = true`, `business_type` vacío, `reservations_enabled = true`. El motivo es que la app trata las funciones como "activas por defecto": el código lee `menu_enabled !== false` y `reservations_enabled !== false`, así que un perfil recién convertido (con esas columnas en `null`) aparece con menú y reservas encendidos, sin categoría y sin plan pagado. Además el bottomsheet de categoría se puede cerrar tocando fuera, dejando la cuenta a medio configurar.

## El estándar que vamos a seguir

Crear la cuenta Business sigue siendo de un toque, gratis y sin fricción. Lo que se gatea es **activar cada herramienta**:

```text
Cuenta Business  →  gratis, 1 toque
   ├── Eventos / entradas pagadas  → requiere datos bancarios (ya está)
   ├── Experiencias                → requiere datos bancarios (ya está)
   ├── Reservas                    → requiere plan activo  (NUEVO)
   └── Menú                        → requiere plan activo  (NUEVO)
```

Nada queda encendido "solo" — todo arranca apagado y el usuario lo activa cuando quiere, momento en el que aparece el gate correspondiente.

## Cambios

### 1. Las funciones arrancan apagadas
- Menú y reservas pasan a leerse como "activo solo si está explícitamente en `true`" en todos lados (ajustes, perfil propio, perfil público, CTAs de posts, confirmación de reserva, dashboard).
- Migración aditiva: `menu_enabled` y `reservations_enabled` pasan a tener `DEFAULT false` para cuentas nuevas. Los negocios que ya las tenían en `true` no cambian.

### 2. Gate de plan para menú y reservas
- En `/settings/business/menu` y `/settings/business/reservations`, si el negocio es de comida y no tiene suscripción activa, el switch no se puede encender: muestra el bloque de upgrade (mismo patrón que `LockedFeature`) con "Activá tu plan desde Bs. 250/mes" y abre el `PlansSheet`.
- Si el plan vence o se cancela (`status` distinto de `active`/`past_due`), las funciones se apagan solas: el perfil público deja de mostrar menú y botón de reservar, y en ajustes aparece el aviso de reactivar el plan.
- El gate se evalúa también del lado público con el RPC `get_business_public_tier` que ya existe, para que ningún visitante vea menú/reservas de un negocio sin plan.
- Negocios que no son de comida no ven menú ni reservas como opciones (hoy reservas ya se filtra así en el perfil público; se aplica igual en ajustes).

### 3. Activar Business, sin cabos sueltos
- Al activar la cuenta, el sheet de categoría deja de cerrarse al tocar fuera: se sale con "Elegir después", que devuelve a la lista de ajustes con el checklist visible y el paso "Elegí tu tipo de negocio" pendiente.
- El checklist de configuración pasa a ser el centro de la pantalla mientras haya pasos abiertos, con el orden: categoría → información → (comida) plan → datos bancarios.
- Cada fila de "Funciones" muestra su estado real: "Requiere plan", "Requiere datos bancarios" o "Activo".

## Detalles técnicos

- Lecturas a corregir de `!== false` a `=== true`: `src/pages/BusinessSettings.tsx`, `src/pages/BusinessMenu.tsx`, `src/pages/BusinessReservations.tsx`, `src/pages/Profile.tsx`, `src/pages/UserProfile.tsx`, `src/components/events/AttachedBusinessCtas.tsx`, `src/pages/ReservationConfirmation.tsx`.
- Migración: `ALTER TABLE public.profiles ALTER COLUMN menu_enabled SET DEFAULT false, ALTER COLUMN reservations_enabled SET DEFAULT false;` (sin borrar ni renombrar nada).
- Gate de plan: `useSubscriptionTier(user.id)` ya expone `status` y `needsActivation`; se agrega un helper `canUseTool = isFood ? (status === "active" || status === "past_due") : false` usado por los dos switches.
- Perfil público: `UserProfile.tsx` consulta `get_business_public_tier(id)` una vez y usa el resultado para decidir si muestra menú y el botón de reservar.
- `BusinessTypePickerSheet`: pasa a modo no descartable (`onInteractOutside`/`onEscapeKeyDown` prevenidos) con botón explícito "Elegir después".
- Sin cambios en eventos ni experiencias: sus gates (Business + datos bancarios) ya funcionan así.
