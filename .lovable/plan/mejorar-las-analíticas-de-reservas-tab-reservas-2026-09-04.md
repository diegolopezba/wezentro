# Mejorar las analíticas de reservas (tab Reservas)

Hoy el tab solo muestra 3 números (reservas, covers, cancelación) y una barra de "días que más se llenan". Propongo convertirlo en un panel operativo que responda a las preguntas que de verdad importan a un restaurante: ¿cuándo me lleno?, ¿cuánto pierdo por cancelaciones y no-shows?, ¿cuánta demanda no pude atender?, ¿quiénes vuelven?

## Qué verá el negocio

1. **Fila de indicadores clave** (con comparación vs. periodo anterior, flecha arriba/abajo)
   - Reservas, Covers, Tamaño promedio de grupo, Tasa de cancelación, No-shows, Anticipación media de reserva (días/horas entre que reservan y la fecha).

2. **Mapa de calor semanal (día x franja horaria)**
   Reemplaza la barra actual de días. Cuadrícula lun–dom por franjas de hora con intensidad según covers; permite ver de un vistazo los picos y los huecos. Toca una celda y muestra reservas/covers de esa franja.

3. **Ocupación vs. capacidad**
   Compara covers reservados contra la capacidad configurada (mesas activas y/o tope de covers por intervalo, según los horarios configurados). Muestra % de ocupación por turno y los turnos más flojos.

4. **Cancelaciones y no-shows**
   Desglose por quién canceló (negocio vs. cliente), a qué hora del día se cancela más, y "covers perdidos" estimados. Incluye una línea de recomendación (p. ej. recordatorio más cercano a la reserva, o ventana de cancelación más corta).

5. **Demanda no atendida (lista de espera)**
   Cuántas personas quedaron en lista de espera, para qué fechas/franjas, y cuántas se convirtieron. Es la señal más clara de "podrías abrir más turnos aquí".

6. **Clientes que vuelven**
   % de reservas de clientes recurrentes vs. nuevos, y un top 5 de clientes por reservas/covers, con avatar y acceso al perfil (mismo estilo que la sección Fan base).

7. **Ritmo de servicio** (solo si hay datos de sentado/completado)
   Tiempo medio entre la hora reservada y el sentado, y duración media de mesa. Sirve para ajustar el turn time configurado.

Cada bloque tiene estado vacío honesto ("Aún no hay suficientes datos") en lugar de gráficos vacíos, y se mantiene el mínimo actual de datos para desgloses.

## Planes

- Básico: indicadores clave básicos (reservas, covers, tamaño de grupo) — como hoy.
- Profesional / Elite: todo lo demás sigue detrás del gate existente `reservas_analytics_full`, con la tarjeta de upsell actualizada para nombrar lo nuevo (mapa de calor, ocupación, no-shows, lista de espera, clientes recurrentes).

## Detalles técnicos

- Nueva RPC `get_business_reservation_analytics(_business_id uuid, _from date, _to date)` en la base de datos (SECURITY DEFINER, valida que quien llama sea el dueño) que devuelve un JSON con: totales, comparación de periodo anterior, matriz día x hora, desglose de estados y `cancelled_by`, agregados de `reservation_waitlist`, top clientes y promedios de `seated_at`/`completed_at`. Esto evita traer todas las filas al cliente como se hace ahora.
- Capacidad tomada de `restaurant_tables` (asientos activos) y `reservation_policies.max_covers_per_interval`, cruzada con `reservation_schedules` para saber qué turnos existen por día.
- Nuevo hook `useReservationAnalytics(period)` que llama la RPC y respeta el `PeriodSelector` actual (7d / 30d / all).
- `ReservasTab.tsx` se reescribe en secciones/componentes pequeños (`ReservationHeatmap`, `OccupancyCard`, `CancellationsCard`, `WaitlistDemandCard`, `RepeatGuestsCard`) reutilizando `StatsCard` y el estilo de tarjetas actual.
- Sin cambios en el flujo de reservas ni en el tab de Gestión; solo lectura y presentación.
- El gate `reservas_analytics_full` y `PlansSheet` se mantienen tal cual.

## Nota

Actualmente hay muy pocas reservas registradas, así que varios bloques mostrarán el estado "sin datos suficientes" hasta que haya más volumen; la lógica queda lista para cuando lo haya.
