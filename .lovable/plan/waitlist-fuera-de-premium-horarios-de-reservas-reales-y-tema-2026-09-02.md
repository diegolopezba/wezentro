# Waitlist fuera de Premium, horarios de reservas reales y tema claro en Business

## 1. Quitar "Waiting List" del plan Premium

En `src/lib/subscriptionTiers.ts`:
- Sacar `reservation_waitlist` de las features de Premium (queda sin ningún plan que lo habilite).
- Quitar el bullet "Waiting List para aprovechar cancelaciones" y el highlight "Waiting List" de Premium.
- Quitar la fila "Waiting List de reservas" de la tabla comparativa.
- Reemplazar el hueco con el contenido que ya existe (mesas ilimitadas, prioridad en discovery, insights de la ciudad) para que la tarjeta no quede corta.

No se toca el código de waitlist de eventos (`event_waitlist`), que es otra cosa y sigue funcionando.

## 2. Reservas: se muestran horarios que el negocio no configuró

Lo que se verificó en la base de datos:
- El restaurante Diego Lopez (plan Básico activo) **no tiene ninguna fila en `reservation_schedules`**. De hecho, ningún negocio de la plataforma tiene filas guardadas en esa tabla.
- La función `get_reservation_availability` tiene un fallback: si no hay horarios para ese día de la semana, usa `profiles.reservation_start_time`–`reservation_end_time`, que para este negocio es 12:00–22:00. Eso genera slots cada 30 min de 12:00 a 22:00, que la UI agrupa en almuerzo / cena / otros. Esa es exactamente la pantalla que ves.
- Además, la función no aplica el límite de plan: aunque hubiera varios turnos guardados, Básico (1 turno por día) no se respeta del lado del servidor.

Por qué no hay horarios guardados (a confirmar en el primer paso): el editor de horarios precarga un turno por defecto (Cena 18:00–23:00) que **se ve configurado pero nunca se guarda**, porque el botón "Guardar horarios" está deshabilitado hasta que haya un cambio manual. Si el negocio nunca tocó nada y salió de la pantalla, no queda nada en la base.

### Pasos

1. **Confirmar la causa**: reproducir el guardado de horarios desde la pantalla de Reservas con un test de navegador y ver si la fila llega a la base o si falla la mutación. Si falla, se arregla ahí primero.
2. **Sin fallback silencioso**: si el negocio tiene reservas activadas pero no tiene horarios configurados, no inventar 12:00–22:00. La disponibilidad devuelve vacío y el usuario ve "Este negocio todavía no publicó sus horarios", y el dueño ve un aviso en Ajustes → Reservas para configurarlos.
3. **Sembrar horarios al activar reservas**: al prender el toggle de reservas por primera vez, crear las 7 filas por defecto (un turno) para que lo que se ve en la pantalla sea lo que realmente se aplica.
4. **Guardar el estado inicial**: el editor guarda también cuando nunca hubo filas, aunque el usuario no haya editado nada, para que la vista y la base nunca se contradigan.
5. **Aplicar el límite de turnos por plan en el servidor**: en `get_reservation_availability` y en `create_reservation`, si el plan del negocio es Básico se usa solamente el primer turno de cada día (por hora de inicio). Así, aunque un negocio haya bajado de plan, no queda sirviendo múltiples turnos.
6. Verificar de punta a punta: configurar un turno en Ajustes y comprobar que la hoja de reserva del usuario muestre solamente esas horas.

## 3. Tema claro en Business, headers oscuros

Se agrega un scope reutilizable `.light-surface` en `src/index.css` (mismo enfoque que el `.light-sheet` que ya existe: redefine los tokens semánticos, así los componentes hijos se adaptan solos sin tocar clases una por una).

Pasan a tema claro, con el header superior en oscuro:
- Business (página principal de ajustes de negocio)
- Business Dashboard
- Información del negocio
- Menú
- Reservas
- Experiencias
- Ventas y promotores
- Plan y facturación, incluida la página pública de planes
- Pagos

Se mantiene oscura la tarjeta de "Plan activo" dentro de la página principal de Business.

La pestaña Gestión (`/business-hub`) queda como está en esta pasada; se puede pasar a claro después si querés.

## Notas técnicas

- Tokens: `.light-surface` define `--background`, `--card`, `--muted`, `--border`, `--primary`, etc. en claro; el `<header>` de cada página se envuelve en un `.dark` anidado para conservar la barra oscura y el contraste de sus iconos.
- Migración SQL: reemplazo de `get_reservation_availability` y `create_reservation` (fallback removido + límite de turnos por tier leído desde `business_subscriptions`).
- Sembrado de horarios: en el handler del toggle de reservas de `BusinessReservations.tsx`, insertando por `useSaveSchedules` solo cuando la tabla está vacía para ese negocio.
