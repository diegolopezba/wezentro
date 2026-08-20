# Conectar Experiencias con las publicaciones + onboarding por sección

Hoy podés crear una experiencia en Configuración → Negocio → Experiencias, pero queda en un callejón sin salida: no hay ninguna forma de asociarla a una publicación, no se avisa que hacen falta los datos de cobro, y no hay explicación de cómo funciona cada sección.

## 1. Datos de cobro visibles y accionables

En la página de Experiencias:
- Si todavía no hay cuenta de cobro registrada, mostrar arriba una tarjeta de aviso: "Necesitás tus datos de cobro para vender experiencias" con botón "Configurar cobros" que lleva a `/settings/business/payments`.
- El botón "Nueva experiencia" sigue disponible (se puede preparar la experiencia), pero al intentar publicarla (`is_active`) sin datos de cobro se abre la hoja existente `BeneficiaryRequiredSheet` y la experiencia queda como "Oculta".
- Cada tarjeta de experiencia muestra el motivo real por el que está oculta ("Falta configurar cobros" en vez de solo "Oculta").

## 2. Publicar una experiencia (el paso que falta)

La base de datos ya tiene el vínculo `events.experience_id`, pero no hay interfaz para usarlo.

- En la página **Crear** (y en Editar publicación), cuando el usuario tiene experiencias creadas, aparece una fila nueva: "Reservar una experiencia" con un selector de sus experiencias activas.
- Al elegirla, la publicación queda vinculada y se ocultan los campos de precio/entradas (el precio viene de las opciones de la experiencia).
- Si no tiene ninguna experiencia, la fila muestra un acceso directo "Crear experiencia" hacia la sección de Experiencias.
- Desde la propia página de Experiencias, cada tarjeta gana una acción "Publicar" que abre Crear con esa experiencia ya seleccionada.

## 3. Reserva del lado del invitado

La hoja de reserva ya está construida pero nunca se abre.

- En el detalle de una publicación con experiencia vinculada, el botón principal pasa a ser "Reservar" y abre `ExperienceBookingSheet` (fecha → hora → opción → personas → pago QR).
- El detalle muestra duración y precio desde la experiencia en lugar del precio de entrada.

## 4. Onboarding por sección (Experiencias, Menú, Reservas)

Una hoja inferior reutilizable de bienvenida, con el mismo estilo de pasos que `BusinessIntroSheet`:
- Se abre automáticamente la primera vez que se entra a cada sección y queda disponible siempre desde un botón "¿Cómo funciona?" en el encabezado.
- **Experiencias**: qué es una experiencia, crear opciones y precios, días y horarios, cupos por horario, datos de cobro, y cómo publicarla para que la gente reserve.
- **Menú**: crear categorías, agregar platos con precio y foto, y dónde lo ve el cliente desde tu perfil.
- **Reservas**: cargar tus mesas, definir horarios, reglas (antelación, duración) y cómo llegan y se confirman las reservas.
- Se recuerda por sección en el almacenamiento local para no repetirse.

## Detalles técnicos

- Nuevo `src/components/business/FeatureIntroSheet.tsx`: hoja genérica con pasos (icono, título, texto) + `useFeatureIntro(key)` con persistencia en `localStorage`; se usa en `BusinessExperiences.tsx`, `BusinessMenu.tsx`, `BusinessReservations.tsx`.
- `BusinessExperiences.tsx`: usar `useHasBeneficiary()` para el aviso y para bloquear la activación; reutilizar `BeneficiaryRequiredSheet`.
- `ExperienceEditorSheet.tsx`: forzar `is_active = false` si no hay beneficiario y explicar el motivo.
- `Create.tsx` / `EditEventSheet.tsx`: nuevo selector que escribe `events.experience_id`; oculta `price`/tiers cuando hay experiencia. Navegación con `state: { experienceId }` desde Experiencias.
- `EventDetail.tsx` / `useEventDetailState.ts`: si `event.experience_id`, cargar la experiencia y montar `ExperienceBookingSheet` en el CTA flotante.
- Sin cambios de esquema: `events.experience_id` y las tablas `experience_*` ya existen.
