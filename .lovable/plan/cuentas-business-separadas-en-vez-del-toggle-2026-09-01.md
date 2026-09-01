# Cuentas Business separadas (en vez del toggle)

Hoy cualquier cuenta personal se convierte en Business con un switch en Ajustes, y la app se ve igual para todos. El cambio: Business pasa a ser un **tipo de cuenta que se elige al crearla**, con su propia navegación.

## 1. Tipo de cuenta

- Nuevo campo `account_type` en el perfil: `personal` (por defecto) o `business`.
- Se define al momento del registro y no se cambia desde la UI.
- Los negocios que ya existen se marcan como `business` automáticamente (migración de datos), así no pierden nada.
- Se elimina el switch "Cuenta Business" de Ajustes. En su lugar, una cuenta personal que quiere ser negocio ve: "Creá una cuenta Business" → la lleva a `/business` (el onboarding que ya existe) y desde ahí a un registro nuevo, con su propio email y contraseña.

## 2. Registro Business

- `/business` (los 3 pasos informativos) termina en **"Crear mi cuenta Business"** → `/auth` en modo registro con la intención business ya marcada (esto ya funciona hoy).
- Al terminar el registro + verificación, el perfil se crea directamente con `account_type = business` y entra al wizard `/business/setup` (categoría, info, datos bancarios).
- Si alguien ya está logueado con su cuenta personal y toca "Crear mi cuenta Business", se le avisa que es una cuenta aparte y se le ofrece cerrar sesión para registrarla.

## 3. Navegación por tipo de cuenta

Cuenta personal (igual que hoy):

```text
Inicio · Explorar · Crear · Entradas · Perfil
```

Cuenta Business:

```text
Inicio · Explorar · Crear · Gestión · Perfil
```

- **Gestión** reemplaza **Entradas**: una sola página con pestañas de Reservas, Ventas/entradas del evento, Experiencias y acceso al Dashboard — reutilizando las vistas de negocio que ya existen.
- El negocio sigue pudiendo navegar el feed, guardar, seguir y chatear; lo que sale de su camino es la compra de entradas y las reservas como cliente (los botones de compra/reserva siguen vijentes y pueden hacer la mayor parte del flow de compra, vista de menú o reserva, pero justo antes de pagar/reservar/unirse a guestlist, aparece en el bottomsheet el mensaje que les dice que solo las cuentas personales pueden comprar tickets/reservar/booking.
- El botón Crear, para business, va directo al flujo de evento/post sin el gate de "necesitás cuenta Business", ( pero si aparece el gate al intentar crear el evento si el business todavia no ha agregado sus datos de beneficiario)

## 4. Gates que se mantienen

Sin cambios respecto a lo ya implementado: menú y reservas requieren plan activo; eventos y experiencias con precio requieren datos bancarios. Crear la cuenta Business sigue siendo gratis y de un toque.

## Notas técnicas

- Migración aditiva: `ALTER TABLE profiles ADD COLUMN account_type text NOT NULL DEFAULT 'personal'`, backfill `= 'business'` donde `is_business = true`. `is_business` se mantiene y se escribe en paralelo para no romper el código y las policies actuales.
- `handle_new_user` y `BusinessSetup.tsx` escriben ambos campos.
- `AuthContext` expone `accountType`; un hook `useIsBusinessAccount()` centraliza la lectura.
- `BottomNav.tsx` elige el set de tabs según el tipo de cuenta; nueva ruta `/gestion` (`src/pages/BusinessHub.tsx`) que agrupa `BusinessReservations`, ventas, experiencias y el acceso a `/dashboard`. `/tickets` sigue existiendo y redirige a `/gestion` para cuentas business.
- `Settings.tsx` / `BusinessSettings.tsx`: se quita el `Switch` de conversión y la llamada `update({ is_business })`; queda el enlace a `/business`.
- Botones de compra/reserva (`EventDetail`, `AttachedBusinessCtas`, `ReservationSheet`) se condicionan al tipo de cuenta.