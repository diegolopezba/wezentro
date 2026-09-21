# Fix: el sheet de "Editar área" sube demasiado y no se puede arrastrar para cerrar

## Qué pasa

El scroll del formulario funciona bien. El problema es la altura: con el formulario completo, el sheet crece hasta su tope (`max-h-[85dvh]`) y en pantallas de teléfono queda prácticamente pegado al borde superior. El handle y el título quedan tan arriba que ya no hay zona cómoda para agarrar el sheet y bajarlo, y visualmente parece pantalla completa.

## Cambio

**`src/components/venue/AreaEditSheet.tsx`** — bajar el tope de altura del sheet para que siempre quede una franja del fondo visible arriba:

- `max-h-[85dvh]` pasa a `max-h-[80dvh]` (deja ~20% de pantalla arriba con el overlay oscuro visible).
- Mantener el resto de la estructura tal cual: handle + header fijos arriba, cuerpo scrolleable con `data-vaul-no-drag`, footer fijo con Guardar / Duplicar / Eliminar.
- Asegurar que la zona del handle y el título **no** tenga `data-vaul-no-drag`, para que arrastrar desde ahí siga cerrando el sheet (hoy ya es así).

No se toca ningún otro sheet, ni la lógica de guardado, ni el plano del lugar.

## Verificación

- Typecheck (`npx tsgo --noEmit`).
- Playwright en viewport de teléfono (393×822): abrir "Editar área" y comprobar que el borde superior del sheet queda claramente por debajo del tope de la pantalla, con el fondo visible arriba, y que el formulario sigue scrolleando y el botón Guardar sigue visible.
- Confirmación en tu teléfono: el sheet debe poder bajarse arrastrando desde la barrita de arriba.
