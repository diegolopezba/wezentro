# Experiencias como tipo de publicación propio

Hoy una experiencia se "pega" a un post o evento con un selector dentro de Crear. Pasa a ser un tipo de publicación propio, al mismo nivel que Post y Evento.

## Cómo queda el flujo

1. El negocio precrea la experiencia en Ajustes > Business > Experiencias (segmentos, precios, días, horarios, cupos, datos de cobro). Sin cambios ahí.
2. En **Crear** aparece una tercera pestaña: **Experiencia** (solo para cuentas business con Experiencias activadas).
3. Al elegirla, el usuario selecciona cuál de sus experiencias activas va a publicar y completa únicamente: **media, título y descripción**.
4. Todo lo demás (precio, ubicación/punto de encuentro, duración, horarios, cupos) sale de la experiencia; no se muestran campos de fecha, precio, entradas, áreas, lista de espera ni botones de menú/reservas.
5. Se puede publicar la misma experiencia varias veces (distintas fotos o textos); todas apuntan a la misma configuración de reservas.

## Detalle y feed

- La publicación se ve como una tarjeta normal en el feed y en el perfil, con una etiqueta "Experiencia".
- En el detalle, el CTA principal es **Reservar**, que abre la hoja de reserva actual (fecha → horario → opción → personas → pago QR o tarjeta). Se muestran duración y precio desde la experiencia en lugar de precio de entrada.

## Publicaciones existentes

Las publicaciones que hoy tienen una experiencia vinculada por el toggle pasan a mostrarse como publicaciones tipo Experiencia en todos lados (feed, perfil, detalle, edición). No se pierde nada; se normaliza su tipo.

## Qué se elimina

- La tarjeta "Reservar una experiencia" con chips de selección dentro de Crear (post/evento) y dentro de Editar publicación.
- Un post o evento normal ya no puede tener experiencia vinculada.

## Detalles técnicos

- Sin cambios de esquema: se sigue usando `events.experience_id`. Una publicación es "Experiencia" cuando `experience_id` no es nulo.
- Normalización de datos existentes (run_sql, no migración): en filas de `events` con `experience_id` no nulo, poner `is_post = true`, `has_guestlist = false`, `price = 0` y limpiar `start_datetime`/`end_datetime` para que rindan con el nuevo formato.
- `src/pages/Create.tsx`:
  - `ContentType` pasa a `"post" | "event" | "experience"`; la opción se muestra solo si `isBusiness && experiences_enabled`.
  - Nuevo bloque de selección de experiencia activa (chips) + validación: requiere experiencia elegida y beneficiario cargado (`BeneficiaryRequiredSheet`).
  - En modo experiencia el insert manda `is_post: true`, `experience_id`, `price: 0`, `has_guestlist: false`, sin fecha/ubicación/tiers/áreas/waitlist.
  - Se quita la tarjeta de vinculación de los modos post/evento; el `state.experienceId` que envía `BusinessExperiences.tsx` ahora preselecciona la pestaña Experiencia.
  - `useCreateDraft` guarda también el `experienceId` elegido.
- `src/components/events/EditEventSheet.tsx`: se quita el selector; si la publicación tiene `experience_id` solo se editan media, título y descripción (y se muestra el nombre de la experiencia vinculada, sin poder cambiarla).
- Tarjetas de feed/perfil (`EventCard` / `TimelineCard`): badge "Experiencia" cuando `experience_id` no es nulo, en lugar de precio o fecha.
- `EventDetail.tsx` / `EventDetailModal.tsx` / `useEventDetailState.ts`: ya cargan la experiencia vinculada; se ajusta para que el CTA de reserva sea el principal y se oculten bloques de fecha/entradas.
- `featureIntroSteps.ts`: se actualiza el paso de "Experiencia" del onboarding de Crear para describir la pestaña nueva.
