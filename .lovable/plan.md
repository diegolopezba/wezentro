# Botón "Reservar experiencia" no aparece al abrir el post desde el feed

## Diagnóstico (verificado)

Los datos están bien guardados: el post "Tour" (`01acd115…`) tiene `experience_id` vinculado y la experiencia "Hola" está activa. El problema está en el frontend:

- Al tocar un post desde el feed, `App.tsx` renderiza **`EventDetailModal`** (overlay sobre el feed), no la página completa.
- `EventDetailModal.tsx` **no tiene ningún código de experiencias**: no lee `event.experience_id`, no llama `useExperience`, no renderiza la barra flotante de "Reservar" ni el `ExperienceBookingSheet`.
- Solo `EventDetail.tsx` (página completa, al cargar la URL directa o refrescar) muestra el botón. Por eso el post se ve pero el botón no.

Brechas relacionadas del mismo feature (verificadas):

- `UserProfile.tsx`: el botón "Reservar" del perfil solo abre reservas de mesa; no hay entrada a experiencias (el selector "Mesa o Experiencia" del plan original nunca se construyó).
- `EditEventSheet.tsx`: no permite cambiar/quitar la experiencia vinculada después de publicar.
- La barra de experiencia en `EventDetail.tsx` no verifica `is_active`: una experiencia pausada seguiría mostrando el botón.

## Qué se va a cambiar

1. **`EventDetailModal.tsx`**: agregar `useExperience(event.experience_id)`, la misma barra flotante (título + duración + botón "Reservar") y el `ExperienceBookingSheet`, con `z-[60]` para respetar la escala de capas del modal. Si hay experiencia vinculada, se oculta la barra de reserva de mesa (misma regla que en `EventDetail`).
2. **Guardia `is_active`**: en `EventDetail` y `EventDetailModal`, mostrar la barra solo si la experiencia está activa.
3. **`UserProfile.tsx`**: si el negocio tiene experiencias activas, el botón "Reservar" abre una primera diapositiva de elección — **Reservar mesa** / **Reservar experiencia** — cuando ambas funciones están activas; si solo hay experiencias, abre directo el flujo de experiencia (con lista si hay varias).
4. **`EditEventSheet.tsx`**: agregar el mismo selector de chips de experiencia que tiene Crear, para poder cambiar o quitar la experiencia vinculada.
5. **Verificación**: typecheck + prueba con navegador abriendo el post "Tour" desde el feed como invitado: la barra "Reservar" aparece y la hoja de reserva abre con fecha/horario/segmento.

## Detalle técnico

- `EventDetailModal.tsx`: importar `useExperience` y `ExperienceBookingSheet`; estado local `showExperienceSheet`; el evento ya trae `experience_id` porque `useEvent` hace `select("*")`.
- `UserProfile.tsx`: usar `usePublicExperiences(userProfile.id)`; chooser como primera slide dentro de una hoja `light-sheet` con botones `sheet-action`, reutilizando el patrón de las demás hojas.
- `EditEventSheet.tsx`: reutilizar la sección de chips de `Create.tsx` (gate `experiences_enabled` + `hasBeneficiary`, guardando `experience_id` en el update).
- Sin cambios de base de datos ni de funciones del backend.
