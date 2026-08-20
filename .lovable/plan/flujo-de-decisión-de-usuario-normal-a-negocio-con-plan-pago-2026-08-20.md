# Flujo de decisión: de usuario normal a negocio con plan pago

## Qué pasa hoy (diagnóstico)

Recorrido actual: Registro → Onboarding (usuario, nombre, género/fecha) → app. Para volverse negocio hay que entrar a Ajustes → Business y tocar un switch. Ese switch activa la cuenta Business al instante, sin explicar qué es, qué se gana ni que existen planes pagos. Después aparece de golpe una lista de 6 opciones (Información, Menú, Reservas, Ventas, Plan, Pagos) sin orden ni prioridad. La pantalla de Planes solo se descubre si el negocio ya eligió un tipo de comida y baja hasta "Plan y facturación".

Problemas concretos:
- Cero contexto antes de la decisión: el switch no vende nada, no hay pantalla de valor.
- El precio aparece al final del recorrido, no como parte de la decisión.
- No hay ruta guiada: nadie sabe que primero debe elegir el tipo de negocio (y que eso es lo que decide si hay planes o no).
- No hay ayuda para elegir plan: los tres precios están al mismo nivel, sin recomendación por tamaño de local.
- No hay respuestas a las objeciones típicas (¿me cobran comisión?, ¿puedo cancelar?, ¿cómo pago?).
- El único punto de entrada está enterrado en Ajustes; un dueño de local que usa la app nunca se entera.

## Prácticas que vamos a copiar

De cómo convierten OpenTable, Square, Shopify, Revolut Business y Linktree:
- **Valor antes que precio**: 2-3 pantallas de beneficios concretos antes de ver el número.
- **Un solo CTA por pantalla**, ancho completo, fijo abajo (thumb zone), con una acción secundaria de texto debajo ("Ahora no").
- **Recomendación personalizada**: una pregunta simple (¿cuántas mesas tenés?) que preselecciona el plan, en vez de dejar al usuario comparar solo.
- **Anclaje de precio**: mostrar el costo diario ("Bs. 250/mes ≈ Bs. 8 por día") y compararlo con algo tangible (una reserva perdida).
- **Reducción de riesgo cerca del botón**: "Sin permanencia · Cancelás cuando quieras · Sin comisión por reserva".
- **Manejo de objeciones**: FAQ colapsable al final de la pantalla de planes.
- **Progreso visible**: checklist de configuración con barra de avance después de activar.

## Qué vamos a construir

### 1. Sheet de introducción a Business (nuevo `BusinessIntroSheet`)

Se abre al tocar el switch de "Cuenta Business" (el switch ya no activa nada de inmediato) y también desde el nuevo punto de entrada del perfil. Bottomsheet claro (`light-sheet`, `rounded-t-3xl`) con 3 pasos deslizables y puntos de progreso:

1. **Qué es**: "Convertí tu perfil en el de tu negocio" — perfil con dirección, horarios y botón de contacto.
2. **Qué obtenés**: guestlists y entradas, menú digital, reservas online, dashboard con analíticas.
3. **Cuánto cuesta**: "Gratis para eventos y entradas. Si sos restaurante, café o bar, las reservas y el menú van con un plan desde Bs. 250/mes." Enlace "Ver planes".

CTA fijo abajo: "Activar cuenta Business". Debajo, texto secundario "Podés desactivarla cuando quieras".

### 2. Elección de tipo de negocio inmediata

Al activar, se abre un paso de selección de tipo (las mismas opciones de Información del negocio) presentado como tarjetas grandes en vez de un `Select` escondido. Esta elección define la rama:
- **Eventos / discoteca / otros**: gratis como hoy, sin planes. Se muestra "Tu cuenta Business es gratis; ganás vendiendo entradas".
- **Restaurante / café / bar**: pasa al selector de planes.

### 3. Checklist de configuración en Business

Reemplaza la lista plana por un bloque "Configurá tu negocio" arriba con barra de progreso y pasos marcables: Tipo de negocio → Información y horarios → Plan (solo comida) → Menú → Reservas → Pagos. Cada paso completado se tacha; los pendientes muestran el CTA. La lista completa de funciones queda debajo.

### 4. Pantalla de planes orientada a decisión

Sobre el `PlanSelector` actual:
- **Paso previo de recomendación** (primera vez): "¿Cuántas mesas tenés?" con tres opciones (Hasta 9 / 10 a 20 / Más de 20) que abre el selector con el plan correcto preseleccionado y una etiqueta "Recomendado para vos".
- Precio con anclaje diario debajo del monto: "Bs. 250/mes · unos Bs. 8 por día".
- Línea de confianza sobre el CTA: "Sin permanencia · Sin comisión por reserva · Cancelás cuando quieras".
- CTA único y fijo abajo (ya existe), con el nombre del plan: "Quiero Profesional".
- **Tabla comparativa** colapsable con las funciones clave por plan (turnos, mesas, ritmo, analíticas, prioridad en Discover).
- **FAQ** colapsable: cómo se paga, si hay comisión, qué pasa si cambio de plan, qué pasa con mis reservas si cancelo.
- Al tocar el CTA, sheet de confirmación con el resumen (plan, precio, qué se desbloquea) y el email de contacto para activación manual, con botón para copiar el email.

### 5. Estado de "plan pendiente" para negocios de comida nuevos

Decisión tomada: sin prueba gratis, se paga desde el día 1.
- Los 5 negocios de comida actuales quedan grandfathered en `basico` / `active` (no se toca su fila).
- Los nuevos negocios de comida arrancan en `pending_activation`: perfil, información y menú funcionan; **la configuración de reservas queda bloqueada** con una tarjeta que explica el plan y abre el selector.
- El hook `useSubscriptionTier` expone `needsActivation` para ese estado; hoy `pending_activation` ya cae a `basico` sin features, así que solo hay que exponer la bandera y usarla en la pantalla de Reservas.

### 6. Puntos de entrada visibles

- Tarjeta descartable en Ajustes (arriba de la sección Business) para usuarios no-negocio: "¿Tenés un local? Recibí reservas y vendé entradas" → abre el `BusinessIntroSheet`.
- Entrada en el menú del perfil propio con el mismo destino.

## Notas técnicas

- Archivos nuevos: `src/components/business/BusinessIntroSheet.tsx`, `src/components/business/BusinessTypePickerSheet.tsx`, `src/components/business/BusinessSetupChecklist.tsx`, `src/components/subscriptions/PlanRecommendationStep.tsx`, `src/components/subscriptions/PlanConfirmSheet.tsx`.
- Modificados: `src/pages/BusinessSettings.tsx` (switch → sheet, checklist), `src/pages/Settings.tsx` (tarjeta de entrada), `src/components/subscriptions/PlanSelector.tsx` (anclaje de precio, confianza, comparativa, FAQ), `src/pages/BusinessPlans.tsx`, `src/hooks/useSubscriptionTier.ts` (`needsActivation`), `src/pages/BusinessReservations.tsx` (bloqueo por plan pendiente).
- Migración chica: el trigger que crea la fila por defecto para negocios de comida nuevos pasa a insertar `status = 'pending_activation'` en vez de `active`. Las filas existentes no se modifican.
- La preferencia de "recomendación de plan ya respondida" y el descarte de la tarjeta de Ajustes se guardan en `user_settings` o localStorage; no se agrega tabla nueva.
- Se mantiene el estilo actual: sheets claros con botón negro (`sheet-action`), pantallas oscuras, esquinas `rounded-t-3xl`, rojo solo en corazones y notificaciones.
- Sin cobro real: el CTA sigue derivando al email de contacto y la activación es manual en la base de datos.
