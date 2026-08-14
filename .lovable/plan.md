# Todas las invitaciones sin cuenta por defecto

Quitar la elección entre "Sin cuenta" y "En la app". Toda invitación especial funciona sin registro: el invitado abre el enlace, confirma nombre y correo, y recibe su entrada al instante.

## Qué cambia para el organizador

- Desaparecen los botones "Sin cuenta" / "En la app" de la barra de acciones y el chip "Sin cuenta" de cada fila (ya no aporta información: todas lo son).
- En la tarjeta de "Invitados especiales" aparece un aviso corto y claro:
  "Las invitaciones se envían por correo. El invitado confirma su nombre y correo y recibe su entrada al instante, sin crear cuenta. Si no tenés su correo, compartí el enlace: ahí mismo escribe su nombre y correo para confirmar."
- La selección múltiple queda solo con "Enviar por correo".
- El Excel exportado deja de incluir la columna "modo".

## Detalles técnicos

- Migración sobre `public.event_special_invites`: cambiar el default de `delivery_mode` a `'direct'` y actualizar las invitaciones existentes que sigan en `pending` con `delivery_mode = 'app'` a `'direct'`. Las ya canjeadas/canceladas se dejan como están.
- `SpecialInvitesPanel.tsx`: eliminar `handleSetMode`, el uso de `useSetInviteDeliveryMode`, los dos botones de modo, el badge de modo y la columna `mode` del export; añadir el texto informativo.
- `useSpecialInvites.ts`: quitar `useSetInviteDeliveryMode` (el RPC `set_special_invite_mode` queda en la base sin uso, sin riesgo).
- `inviteImport.ts`: quitar la columna `modo` del Excel.
- Sin cambios en `SpecialInvite.tsx`, el correo o el check-in: siguen soportando ambos modos, solo que ya no se crearán invitaciones en modo `app`.
