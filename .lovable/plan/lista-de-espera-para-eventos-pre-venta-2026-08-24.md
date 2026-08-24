# Lista de espera para eventos (pre-venta)

Permite que un organizador abra un evento en modo "lista de espera": el evento se publica y se puede descubrir, pero los precios y la compra están ocultos. Los usuarios interesados se anotan con un toque y son los primeros en enterarse (y opcionalmente los únicos que pueden comprar durante una ventana exclusiva) cuando las entradas salen a la venta.

## Quién puede activarla

Mismas reglas que para entradas pagadas: solo cuentas Business con datos bancarios (beneficiario de cobro) registrados. Si falta alguno, se muestran las hojas de bloqueo existentes (Business / Datos de cobro).

## Configuración (en "Opciones avanzadas")

Nuevo bloque "Lista de espera" en Crear y en Editar evento:

- Interruptor: Activar lista de espera
- Fecha y hora de apertura de ventas (opcional). Si se define, la liberación es automática.
- Acceso anticipado: "Solo aviso" o "Ventana exclusiva" con duración en horas (por ejemplo 24 h) durante la cual solo los inscritos pueden comprar.
- Cupo máximo de la lista (opcional).

El organizador siempre puede tocar "Publicar entradas ahora" desde el detalle del evento o el panel del negocio para liberar antes de la fecha programada.

## Qué ve el usuario

- Tarjeta del evento: etiqueta "Lista de espera" en lugar de precio.
- Detalle del evento: precios y niveles ocultos, texto "Entradas próximamente" y botón principal "Unirme a la lista". Al unirse cambia a "Estás en la lista" con el número de posición y opción de salir.
- Al liberarse: notificación push + email a todos los inscritos, en orden de inscripción. Si hay ventana exclusiva, los inscritos ven "Acceso anticipado — termina en X h" y pueden comprar; el resto ve "Ventas abren en X h".

## Estados del evento

```text
borrador -> lista_de_espera -> acceso_anticipado (opcional) -> venta_publica
```

## Detalles técnicos

Base de datos:
- Columnas nuevas en `events`: `waitlist_enabled` (bool, false), `sales_open_at` (timestamptz), `waitlist_early_access_hours` (int, 0 = solo aviso), `waitlist_capacity` (int), `waitlist_released_at` (timestamptz).
- Tabla nueva `event_waitlist`: `event_id`, `user_id`, `position` (por orden de creación), `notified_at`, timestamps; único por (event_id, user_id). GRANTs para `authenticated` y `service_role`; RLS: cada usuario gestiona su propia fila, el dueño y colaboradores del evento pueden ver todas las filas de su evento.
- Función `join_event_waitlist(event_id)` con bloqueo de fila para asignar posición y respetar el cupo.

Liberación y avisos:
- Edge function `release-event-waitlist`: valida dueño (o llamada por cron), fija `waitlist_released_at`, crea notificaciones tipo `waitlist_release` y encola emails con la plantilla transaccional existente en lotes.
- Cron cada 5 minutos que llama a la función para eventos con `sales_open_at` vencido y sin liberar.

Reglas de compra:
- Guardas en el servidor (RPC de compra / generación de QR): si `waitlist_enabled` y aún no se liberó, se rechaza la compra; durante la ventana de acceso anticipado solo se acepta si el usuario está en `event_waitlist`.

Frontend:
- Hook `useEventWaitlist(eventId)` (estado, posición, unirse/salir) y helper de fase de venta compartido en `useEventDetailState`.
- Precios ocultos en tarjetas, detalle y hojas de compra mientras la fase no sea de venta.
- Sección "Lista de espera" en el panel del negocio: total de inscritos y botón "Publicar entradas ahora".
