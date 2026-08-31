# Conectar los 3 gates de Premium

Waiting list de reservas queda fuera de este pase (sigue solo como texto en los planes).

## 1. Prioridad en discovery (Premium)

Hoy el feed "Para Ti" no sabe nada de suscripciones: ningún negocio recibe preferencia de posicionamiento.

- Nueva función de base de datos `get_premium_business_ids()` que devuelve los `business_id` con suscripción `elite` en estado `active` o `past_due`.
- La función del feed (`assemble-for-you-slate`) carga esa lista en paralelo con el resto del contexto y aplica un multiplicador suave al puntaje final del contenido creado por esos negocios (~1.08, tope de 100), es decir un empujón de posicionamiento, no un salto al primer puesto.
- El boost solo se aplica a contenido con calidad mínima: si el multiplicador de calidad ya penalizó la publicación (contenido muerto), no se aplica el boost. Así Premium no puede empujar contenido malo.
- La lista se cachea en memoria de la función por 5 minutos para no agregar costo por request.

## 2. Insights de la ciudad (Premium)

Hoy la pestaña "Próximamente" del dashboard es un texto estático.

- Nueva función de base de datos `get_city_benchmarks(_business_id)` (security definer) que devuelve promedios agregados y anónimos de negocios de la misma ciudad y del mismo tipo de negocio: reservas promedio por semana, tamaño promedio de grupo, ticket/precio promedio de eventos, horarios más llenos y tasa de cancelación promedio. Solo devuelve datos si hay al menos 5 negocios en el grupo (umbral de anonimato); si no, devuelve estado "datos insuficientes".
- Nueva pestaña `CityInsightsTab` que reemplaza `ComingSoonTab` en el dashboard, con tarjetas de comparación "tu negocio vs. la ciudad" y el estado vacío cuando no hay suficientes datos.
- Envuelta en `LockedFeature` con `feature="city_insights"`: los planes Básico y Profesional ven la pestaña difuminada con el candado "Disponible en Premium" que abre la hoja de planes.
- La pestaña pasa a llamarse "Insights" en lugar de "Próximamente".

## 3. Gate del plano visual del local (Premium)

- `EventVenueLayoutSection` (paso opcional al crear un evento) se envuelve en `LockedFeature` con `feature="venue_layout"` cuando el negocio no es Premium: el switch "Vender por áreas" queda bloqueado con el candado de upgrade.
- La página `/settings/business/venue-layouts` aplica el mismo gate: los no-Premium ven el candado y el botón "Nuevo plano" deshabilitado. (La entrada en Ajustes de Negocio hoy está oculta con `showVenueLayouts = false`; se deja como está salvo que quieras mostrarla.)
- Refuerzo en base de datos: las políticas de inserción de `venue_layouts` y `venue_layout_areas` pasan a exigir que el dueño tenga suscripción Premium activa, para que el gate no sea solo visual.

## Detalles técnicos

- Los gates de UI usan el hook existente `useSubscriptionTier(businessId).hasFeature(...)`; los negocios que no son de comida siguen sin verse afectados (el hook ya devuelve `true` para ellos).
- Las claves `priority_placement`, `venue_layout` y `city_insights` ya existen en `subscriptionTiers.ts` y ya están asignadas a Premium; no cambia el paquete de planes.
- Migraciones nuevas: dos funciones security definer con `GRANT EXECUTE` a `authenticated`/`service_role`, más el ajuste de políticas de los planos.
