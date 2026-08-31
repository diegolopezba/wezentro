# Crear eventos solo con cuenta Business

Los eventos pasan a ser una función exclusiva de cuentas Business. Las publicaciones normales (posts) siguen abiertas para todos.

## Comportamiento

- La pestaña "Evento" en la página Crear sigue visible y totalmente usable para cualquier usuario: puede subir media, poner fecha, hora, lugar y descripción.
- Al tocar "Publicar" con un evento y sin cuenta Business, no se publica nada: se abre el mismo bottomsheet de gate que ya existe para entradas pagadas, invitando a activar la cuenta Business.
- El sheet explica que crear eventos requiere cuenta Business (gratis, menos de un minuto) y lleva a `/settings/business`.
- Los posts no cambian: cualquier usuario los publica sin gate.

## Conservar el borrador

Al ir a activar la cuenta Business, el borrador del evento se guarda y se restaura al volver a Crear, para que el usuario solo tenga que tocar "Publicar" otra vez.

- Se guarda el estado del formulario (texto, fecha, hora, ubicación, precios, opciones) en almacenamiento local del navegador.
- La media ya subida se conserva por sus URLs; si algo aún estaba subiéndose, se pide de nuevo.
- El borrador se restaura al montar la página y se limpia al publicar con éxito o si el usuario lo descarta.

## Detalles técnicos

- `src/components/events/BusinessRequiredSheet.tsx`: añadir prop `context?: "tickets" | "event"` (por defecto `tickets`, mismo patrón que `BeneficiaryRequiredSheet`). Con `event`, el título pasa a "Solo cuentas Business pueden crear eventos" y el copy y la lista de beneficios se adaptan (eventos, entradas, guestlist, dashboard).
- `src/pages/Create.tsx` (`handleSubmit`, ~línea 336): antes de las validaciones de pago, si `!isPost && !isBusiness` → `setBusinessGateContext("event")`, `setShowBusinessGate(true)` y `return`. Los gates existentes de entradas pagadas y experiencias quedan como están.
- Nuevo estado `businessGateContext` en Create y paso del prop al sheet en la línea 1224.
- Persistencia: nuevo hook ligero `useCreateDraft` que serializa `formData`, `mediaItems` (URLs subidas), `pricingMode`, `draftTiers` y `draftAreas` en `localStorage` con debounce, restaura al montar y borra tras publicar.
