# Pestaña Experiencias en Gestión: misma vista operativa que Reservas

Hoy la pestaña "Experiencias" de `/business-hub` es solo una lista de accesos a ajustes. Pasa a ser una vista operativa igual a Reservas: day picker, totales, filtros de estado y timeline vertical de las reservas de experiencias del día.

## Vista

### 1. Day picker + totales

- Misma tira horizontal de 7 días con punto indicador cuando hay reservas activas, flechas de semana y popover de calendario.
- Línea compacta: "N reservas · M personas · Bs. X" (personas = suma de `quantity`, monto = suma de `amount` de las no canceladas), y el tipo de experiencia

### 2. Filtros pill

Los filtros pill deben ser el tipo de experiencia que ofrece el business, porque un mismo business puede ofrecer diferentes tipos de experiencias.

### 3. Timeline vertical por hora

- Agrupado por `booking_time`, solo horas con reservas, orden ascendente.
- Si el día es hoy: marca "Ahora", y las horas pasadas se colapsan bajo "Ver N horas anteriores".

### 4. Tarjeta de reserva de experiencia

Información relevante propia de experiencias (más que en mesas):

- Avatares de los invitados etiquetados (hasta 3 + "+N") o el avatar del titular si no hay etiquetados.
- Nombre del titular + hora.
- **Título de la experiencia** y **segmento** (ej. "Tour al amanecer · VIP") — clave cuando el negocio corre varias experiencias a la misma hora.
- Cantidad de personas (`quantity`) y monto (`amount`, formato "Bs. ").
- Notas si existen.
- Pill de estado con los mismos colores que Reservas (Comenzada verde, completada azul, no-show ámbar, cancelada destructive).

### 5. Detalle y acciones

Al tocar la tarjeta se abre una hoja de detalle con los datos completos (experiencia, segmento, punto de encuentro, duración, invitados, notas, monto) y los botones de estado: Comenzada, Completada, No-show, Cancelar — usando el RPC existente `set_experience_booking_status`.

## Notas técnicas

- Nuevo `src/components/business/ExperienciasGestionTab.tsx`, montado en `src/pages/BusinessHub.tsx` en lugar del `SettingsGroup` actual (los accesos pasan dentro del tab).
- Se extrae la lógica compartida con `ReservasGestionTab` (DayPill + tira de días, cabecera de timeline, mapa `STATUS_STYLE`/`STATUS_LABEL`, filtros) a un módulo común para no duplicar; el resto queda por tab.
- Nuevo hook `useBusinessExperienceBookingsByDate(businessId, from, to)` en `useExperiences.ts`: filtra por `experience.business_id`, rango de `booking_date`, excluye `pending_payment`, trae experiencia, segmento, titular y los invitados etiquetados (`experience_booking_guests` con perfil). Realtime ya publicado: se monta `useExperienceBookingsRealtime` en este tab.
- Nueva `ExperienceBookingDetailSheet.tsx` con mutación de estado vía `set_experience_booking_status` e invalidación de `["experience-bookings"]` y `["experience-availability"]`.
- Sin migraciones ni cambios de backend: estados, RPC y publicación realtime ya existen.
- Estilo: tema claro de las páginas business, pills `rounded-full`, `active:` en vez de `hover:`.