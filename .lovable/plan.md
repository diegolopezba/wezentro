# Confirmación sin fricción: prefill y entrada al instante

Lo que pediste ya está construido en el flujo "Sin cuenta" (`direct`), verificado en el código:

- El enlace `/i/:token` es público: no pide cuenta, ni contraseña, ni código de 6 dígitos.
- La página precarga nombre y correo desde lo que el organizador importó; ambos son editables.
- Un solo toque confirma y muestra el QR al instante en la misma página.
- Después de confirmar se envía un correo con el mismo QR y un enlace permanente a la entrada.
- La invitación a crear cuenta aparece debajo de la entrada, nunca como muro.

## Ajustes pequeños para que quede exactamente como lo describís

1. Cambiar el texto del botón a **"Confirmar y recibir entrada"** (hoy dice "Confirmar asistencia").
2. Agregar una línea corta arriba de los campos: "Confirmá tus datos — te enviamos la entrada a este correo."
3. Si el correo precargado se edita, la entrada se envía al correo confirmado (ya funciona así; solo se aclara en el texto).
4. Mostrar aviso claro tras confirmar: "Te enviamos la entrada a {correo}".

## Detalles técnicos

Cambios únicamente en `src/pages/SpecialInvite.tsx` (copia del CTA, texto auxiliar y toast). Sin cambios de base de datos ni de funciones: `get_public_invite` ya devuelve el prefill y `confirm_invite_rsvp` acuña el QR de forma idempotente, y el envío usa `send-transactional-email` con la plantilla `invite-confirmed`.

Requisito operativo: para que el invitado reciba el correo, la fila de invitación debe estar en modo "Sin cuenta" antes de enviar (chip por fila o acción masiva por segmento en el panel de invitados especiales).
