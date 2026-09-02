# Day-picker strip en la pestaña Reservas (Gestión)

Reemplazar el calendario mensual inline de la vista Día en `ReservasGestionTab.tsx` por una tira horizontal de días estilo pill (como la referencia: etiqueta de día arriba, número grande, mes abajo; el día seleccionado en pill negro sólido).

## Cambios

### `src/components/business/ReservasGestionTab.tsx`

**Vista Día**
- Quitar el `<Calendar>` mensual inline (la sección `rounded-2xl` con modifiers de puntos).
- En su lugar: tira horizontal scrollable de 7 días (dom–sáb de la semana del día seleccionado), cada día como pill vertical redondeada (`rounded-full`):
  - Arriba: etiqueta corta (`HOY` para hoy, si no `MIÉ`, `JUE`… usando `DAYS_ES`).
  - Centro: número del día grande y en negrita.
  - Abajo: mes corto (`sep`).
  - Estado seleccionado: pill sólido `bg-foreground text-background`; no seleccionado: borde `border-border` con fondo transparente.
  - Indicador pequeño de reservas: punto bajo el número (o contador) cuando el día tiene reservas activas.
- Auto-scroll de la tira para centrar el día seleccionado al cambiar de semana o fecha.
- Las flechas ‹ › pasan a mover de semana en semana (ya que la tira muestra 7 días) en vista Día también — el label central muestra el día seleccionado ("Hoy", "Mañana", "mar 3 sep") como ahora.
- El botón de calendario (Popover) del header se mantiene para saltar a cualquier fecha.

**Vista Semana**
- Se mantiene la tira semanal actual, pero se unifica el estilo visual de los días con el mismo pill de la vista Día para consistencia.

**Resto sin cambios**
- Totales compactos ("N reservas · M personas"), lista cronológica con avatares y `ReservationDetailSheet` quedan igual.
- El rango de datos (`useBusinessReservationsByDate` sobre el mes visible) ya cubre los indicadores de la tira; sin cambios en hooks ni backend.

## Notas técnicas
- Solo frontend, un archivo. Sin migraciones ni cambios en `BusinessDashboard` (sigue usando `ReservasTab`).
- Estilo: dark theme, pills `rounded-full`, `active:` en vez de `hover:`, `[-webkit-tap-highlight-color:transparent]` en los botones.
