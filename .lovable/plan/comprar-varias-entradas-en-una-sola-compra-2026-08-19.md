# Comprar varias entradas en una sola compra

Permitir que un usuario compre 1..N entradas de un evento en el mismo pago, asigne (etiquete) algunas a usuarios con cuenta, y reciba todas las entradas por email para reenviarlas a quien no tenga cuenta.

## Cómo se vive

1. En el bottomsheet de pago aparece un selector de cantidad (1 a 10, limitado por el cupo restante del evento o del tier).
2. Debajo, una fila por entrada: "Entrada 1 — para mí" (fija) y "Entrada 2, 3..." con un botón "Asignar a alguien" que abre un buscador de usuarios (mismo buscador que ya se usa para etiquetar). Asignar es opcional.
3. El total se recalcula (precio x cantidad) y se genera un solo QR de pago por el monto total.
4. Al confirmarse el pago: se crean N entradas independientes, cada una con su propio QR de acceso.
   - La entrada del comprador y las asignadas aparecen en "Entradas" de cada cuenta.
   - Las no asignadas quedan como "Entrada extra" en la cuenta del comprador, para reenviar.
5. Emails: el comprador recibe un correo con las N entradas (cada una con su QR y nombre del asignado si lo hay). Cada usuario etiquetado recibe su propio correo con su entrada, más una notificación en la app.

## Reglas

- Máximo 10 entradas por compra (ajustable).
- No se puede asignar dos entradas al mismo usuario en el mismo evento (ya existe una entrada por usuario/evento).
- Si el evento o el tier tiene cupo, la cantidad se limita al restante y se valida de nuevo en el servidor al generar el QR y al confirmar.
- Eventos gratis y áreas del plano visual quedan igual (cantidad = 1) en esta fase.

## Detalles técnicos

**Base de datos** (`guestlist_entries`):
- `user_id` pasa a ser nullable; se agrega `purchased_by_user_id uuid`, `guest_name text`, `guest_email text`, `payment_session_id uuid`.
- Se reemplaza la unicidad `(event_id, user_id)` por un índice único parcial `(event_id, user_id) where user_id is not null`, para que varias entradas sin asignar puedan coexistir.
- RLS: el comprador puede ver/actualizar (asignar) las entradas que compró; el asignado ve la suya; el organizador ve todas las de su evento. GRANTs correspondientes.
- `payment_sessions`: agregar `quantity int not null default 1` y `assignees jsonb` (lista de user_id por posición).

**Edge functions**:
- `generate-qhantuy-qr`: acepta `quantity` y `assignees[]`; valida cantidad (1..10), cupo del tier/evento y que los asignados existan y no tengan ya entrada; cobra `precio * quantity`; guarda cantidad y asignados en la sesión.
- `qhantuy-callback`: crea N filas de `guestlist_entries` (una por entrada) en lugar de un upsert; incrementa `sold_count` del tier N veces (nueva RPC `increment_tier_sold_by(_tier_id, _qty)` con verificación de cupo); notifica al comprador y a cada asignado; dispara los emails.
- `send-transactional-email` + nueva plantilla `tickets-purchased` en el registry: correo al comprador con todas las entradas (QR vía `invite-qr?token=`) y correo individual a cada asignado.
- `check-in-guest`: soportar entradas con `user_id` nulo (mostrar `guest_name` o "Entrada extra de {comprador}").

**Frontend**:
- `PaymentQRModal.tsx`: selector de cantidad, lista de asignación por entrada, total dinámico, envío de `quantity`/`assignees`.
- Nuevo `TicketAssigneePicker` (buscador de usuarios reutilizando `useSearchUsers`).
- `TicketsList.tsx`: incluir entradas donde el usuario es `purchased_by_user_id`, con etiqueta "Extra" o "Asignada a X"; permitir asignar después de la compra si quedó sin asignar.
- `YouAreGoing.tsx`: soportar varias entradas del mismo evento (una tarjeta/QR por entrada).
