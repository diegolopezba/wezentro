# Lounges: info extra, preguntas al comprador y compra en páginas

## Cómo lo hacen las apps grandes

- **Dice.fm (Tables)**: cada mesa/lounge tiene nombre, precio, capacidad, y una **descripción con lo que incluye** (botella, ubicación, mínimo de consumo). Tras comprar, el usuario recibe una entrada distinta tipo "Table booking" con esos detalles y las instrucciones de llegada.
- **Shotgun.live**: las tablas tienen descripción y perks; el organizador puede pedir datos extra al comprador (nombre del grupo, teléfono, notas) y los ve en su panel por reserva.
- **Luma**: el organizador define **preguntas de registro** (texto corto, texto largo, sí/no, opción múltiple), cada una obligatoria u opcional. Las respuestas se ven junto a cada invitado y salen en el correo de confirmación.

Tomamos lo mismo: descripción/perks por área + preguntas configurables por evento, respuestas visibles para el negocio y devueltas al comprador en su entrada y en el correo.

## Qué se construye

### 1. Compra en páginas, no en bottom sheet

Reemplazar `PurchaseSheet` por un flujo de pantallas completas (mismo estilo de overlay iOS que ya usa la app):

```text
/evento/:id/comprar         → elegir qué comprar (tiers + plano/lista de áreas)
/evento/:id/comprar/datos   → cantidad/personas + preguntas del organizador
/evento/:id/comprar/pago    → resumen (subtotal, comisión 1%, total) + QR o tarjeta
```

Scroll natural de página, header con volver, botón de acción fijo abajo. El QR de pago actual se muestra en la última pantalla.

### 2. Info extra del área (lado negocio)

En "Editar área" (catálogo y por evento) se agregan campos opcionales:

- **Descripción** (qué incluye el lounge, ubicación, mínimo de consumo).
- **Lista de beneficios** (chips: botella, mesero, acceso preferente…).
- **Nota de llegada** (instrucciones que solo ve quien compró).

### 3. Preguntas al comprador

Editor de preguntas en el evento (sección "Preguntas al comprar"): texto corto, texto largo, teléfono, sí/no y opción múltiple; cada una obligatoria u opcional, y con alcance **solo lounges** o **todas las compras**. Se responden en la pantalla "datos" antes de pagar y se guardan con la reserva.

### 4. Lado negocio: ver quién compró qué

La hoja de "Reservas de lounge" pasa a una vista con detalle por reserva: comprador (avatar, nombre, usuario, contacto), área, personas, entradas incluidas, monto pagado, hora de compra, estado, y **las respuestas a las preguntas**. Acciones existentes (check-in, no-show, cancelar) se mantienen. Además, en Gestión > Eventos la tarjeta del evento muestra "X/Y lounges vendidos" para que la venta sea visible sin abrir nada.

### 5. Lado comprador: entrada de lounge real

- En Entradas aparece una tarjeta propia "Reserva de lounge" con el nombre del área, personas, entradas incluidas, descripción/beneficios, nota de llegada y QR de acceso. (También aparece un lounge icon que al apretarlo muestra un bottomsheet con el area plan visual y el lounge comprado, asi puede saber exactamente que lounge les toca)
- Nuevo correo `lounge-confirmed` con los mismos datos + respuestas enviadas.

## Detalles técnicos

- Migración: `description text`, `perks text[]`, `arrival_note text` en `venue_layout_areas` y `event_areas`; nueva tabla `event_purchase_questions` (event_id, label, type, required, options jsonb, scope, display_order) con GRANTs y RLS (lectura pública de eventos publicados, escritura solo del dueño); `area_bookings.answers jsonb default '{}'`.
- Rutas nuevas en `App.tsx` montadas como overlay de página (patrón `PageModal`), con estado de compra en un hook `useCheckoutFlow` que reemplaza el estado local de `PurchaseSheet`.
- `generate-qhantuy-qr` recibe y persiste `answers` al crear el `area_booking`; sin cambios en montos ni en el split 94/6 + 1% de pasarela.
- `qhantuy-callback` dispara el nuevo correo de lounge (registro en `transactional-email-templates/registry.ts`).
- Reutiliza `VenueGridCanvas`, `useVenueLayouts` y los hooks de reservas ya existentes.

## Fuera de alcance

- Cobro por consumo mínimo o pagos parciales del lounge.
- Chat directo comprador ↔ negocio.
- Preguntas por invitado (solo por compra).