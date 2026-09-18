# Volver a invitaciones con cuenta obligatoria

Se elimina el camino "sin cuenta". Toda invitación especial vuelve a requerir cuenta: el invitado abre el enlace (por correo o compartido), ve el evento y, al tocar "Aceptar invitación especial", se le pide crear cuenta o iniciar sesión. Al terminar, vuelve al evento y recibe su entrada.

## Cómo queda el flujo

1. El invitado recibe el correo o el enlace `/i/:token`.
2. Si no tiene sesión, se lo lleva a crear cuenta / iniciar sesión (el enlace queda guardado).
3. Ya con cuenta, vuelve al evento con la invitación activa y el botón "Aceptar invitación especial".
4. Al aceptar, la entrada queda en su cuenta como siempre (guestlist, QR en la app).

## Qué cambia para el organizador

- El aviso del panel de invitados especiales pasa a decir que el invitado debe crear su cuenta para recibir la entrada.
- Los estados por fila dejan de mostrar "Asistencia confirmada" sin cuenta; quedan: sin enviar / correo enviado / usada / cancelada, más el check-in.
- El correo de invitación vuelve al mensaje clásico: "Aceptar invitación especial" que lleva al evento pasando por el registro.

## Detalles técnicos

- Migración sobre `public.event_special_invites`: `delivery_mode` default vuelve a `'app'` y las invitaciones `pending` con `'direct'` pasan a `'app'`. No se borran columnas (`qr_code_token`, `rsvp_*`, `checked_in_at`) para no romper entradas ya confirmadas.
- `src/pages/SpecialInvite.tsx`: se reduce al flujo clásico — carga la invitación, si no hay sesión guarda el token (`setPendingSpecialInvite`) y redirige a `/auth`; si hay sesión reenvía a `/event/:id?invite=token`. Se elimina el formulario RSVP, el QR en página y el bloque "creá tu cuenta".
- `src/hooks/useSpecialInvites.ts`: se quitan `useConfirmInviteRsvp`, `getInviteQrImageUrl` y el uso de `usePublicInvite` en la página pública (la RPC `get_public_invite` / `confirm_invite_rsvp` quedan en la base sin uso).
- `supabase/functions/_shared/transactional-email-templates/special-invite.tsx`: copia y CTA vuelven al flujo con cuenta; se deja de usar `send-invite-confirmed` y la plantilla `invite-confirmed` (funciones quedan desplegadas pero sin invocarse desde la app).
- `check-in-guest` mantiene el respaldo por `qr_code_token` para que las entradas ya confirmadas sin cuenta sigan siendo válidas en la puerta; no se emiten nuevas.
- `SpecialInvitesPanel.tsx`: texto informativo actualizado; el resto (importación, envío por correo, export Excel) sin cambios.
