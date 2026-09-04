# Insights: un panel de comparación que valga el plan Elite

Hoy la pestaña Insights muestra dos bloques separados y bastante planos: "Tu negocio vs. la ciudad" (filas de números) y "Benchmark Competitivo" (otra tabla parecida, calculada en el navegador consultando hasta 20 negocios uno por uno, lo que es lento y caro). La idea es fusionarlos en una sola experiencia clara, visual y accionable.

## Qué verá el negocio

1. **Tarjeta de posición**
   Un titular grande tipo "Estás en el puesto 3 de 12 bares en Santa Cruz" con un percentil ("mejor que el 78% de negocios similares") y una etiqueta de estado: Líder / Por encima del promedio / En el promedio / Con espacio para crecer.

2. **Comparaciones con barras, no solo números**
   Cada métrica pasa a una barra horizontal: tu valor, el promedio de la ciudad y el valor del mejor 25% (top quartile), con color verde si estás arriba y neutro si estás abajo. Métricas unificadas en un solo bloque:
   - Reservas por semana
   - Tamaño promedio de grupo
   - Tasa de cancelación
   - Precio promedio de entrada
   - Alcance por evento
   - Engagement %
   - Seguidores
   - Ocupación de guestlist / lounges

3. **Tendencia, no solo foto fija**
   Debajo de cada métrica clave, una mini señal de si mejoraste o empeoraste frente al periodo anterior, respetando el selector de periodo que ya existe en el dashboard.

4. **Horario que más se llena**
   Se convierte en un pequeño gráfico de barras por hora (tu negocio vs. la ciudad), en vez de dos números sueltos.

5. **Recomendaciones automáticas**
   2 o 3 tarjetas de acción generadas por reglas simples según dónde estés peor, por ejemplo: "Tu tasa de cancelación es 12% vs 6% de la ciudad — activá confirmación previa" con un botón que lleva a la pantalla correspondiente (reservas, promociones, impulsar publicación). Sin IA, solo reglas claras.

6. **Estados vacíos honestos**
   Si no hay suficientes negocios similares, se mantiene el mensaje de privacidad actual, pero mostrando cuántos faltan para desbloquear ("3 negocios más en tu ciudad").

Todo el bloque sigue detrás del plan Elite/Premium, con la vista bloqueada mostrando datos difuminados en vez de guiones, para que se entienda el valor.

## Detalles técnicos

- Ampliar la función de base de datos `get_city_benchmarks` (nueva migración, versión `v2`) para que además del promedio devuelva: percentil del negocio, ranking y total de pares, valor del cuartil superior por métrica, distribución de horas agregada, y las métricas de alcance/engagement/seguidores/ocupación que hoy se calculan en el cliente. Mantiene el mínimo de 5 pares y `security definer` con `search_path = public`.
- Eliminar `useCompetitiveBenchmark` del cliente (el bucle de 20 consultas por par) y borrar `CompetitiveBenchmark.tsx`; toda la comparación pasa a una sola llamada RPC cacheada 10 minutos.
- Reescribir `CityInsightsTab.tsx`: tarjeta de posición, componente `BenchmarkBar` reutilizable (tu valor / ciudad / top 25%), mini gráfico de horas con recharts (ya está en el proyecto) y lista de recomendaciones derivada de los deltas.
- Mantener "Acciones en Perfil" (visitas al perfil) integrado en la nueva tarjeta de posición en vez de un bloque suelto.
- Sin cambios en el gating ni en el resto del dashboard; el diseño respeta tokens existentes, pills y tema oscuro.
