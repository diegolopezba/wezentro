# Carrusel de entradas en /going/:eventId (Ver mi entrada)

## Problema
`YouAreGoing.tsx` busca una sola entrada del evento (`.maybeSingle()` por `user_id`). Cuando un usuario compra varias entradas, las adicionales quedan con `user_id = null` y `purchased_by_user_id = buyer`, así que la pantalla muestra solo 1 entrada/QR aunque la persona tenga 3. En `/tickets` sí se ven todas ("Entrada 1/2/3").

## Solución
Convertir la pantalla "Ver mi entrada" en un carrusel deslizable cuando hay más de una entrada, con indicador inferior de paginación.

### Cambios (un solo archivo: `src/pages/YouAreGoing.tsx`)

1. **Query multi-entrada**: reemplazar la query actual por una que traiga todas las entradas del usuario para ese evento, con el mismo filtro probado de `TicketsList.tsx`:
   ```ts
   .or(`user_id.eq.${user.id},and(user_id.is.null,purchased_by_user_id.eq.${user.id})`)
   ```
   ordenadas por `joined_at` ascendente (misma numeración que /tickets: "Entrada 1, 2, 3...").

2. **Entrada específica por deep-link**: si viene `?ticketId=`, el carrusel arranca posicionado en esa entrada (embla `startIndex`), así los links desde /tickets siguen funcionando.

3. **Carrusel**: envolver las cajas 2 (detalles) y 3 (acción QR) en un carrusel horizontal embla (ya está en el proyecto, mismo patrón que `MediaCarousel`), donde cada slide contiene el detalle + acción de una entrada:
   - Titular: nombre (propio o `guest_name`), y "Entrada N de M" cuando M > 1.
   - Indicador de puntos abajo (mismo estilo que los dots del `MediaCarousel`) solo si M > 1; con 1 entrada se ve exactamente como hoy.
   - Swipe táctil habilitado solo con M > 1.

4. **Acción por entrada**: la caja 3 refleja la entrada activa (Mostrar QR / "Ya fue usado" / pago pendiente / solicitud pendiente), y "Mostrar QR" abre el QR de la entrada activa. Si una entrada está usada y otra no, se ve el estado real de cada una al deslizar.

5. **Estados vacíos/singulares intactos**: sin entradas se mantiene el comportamiento actual; con una sola entrada no hay dots ni swipe.

## Verificación
- Typecheck (`tsgo --noEmit`) y build.
- Playwright en la sesión de preview: abrir `/going/:eventId` de un evento con múltiples entradas (caso Mathias / Cábala by WhyNot) y confirmar que se desliza entre las 3 entradas, se ve el indicador, y cada QR es el token correcto.
