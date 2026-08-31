# Menú con fotos para planes Profesional y Premium

Hoy el menú es solo texto y precio. Los planes Profesional y Premium podrán agregar una foto por ítem del menú; el plan Básico sigue con menú de texto (y ve el candado de upgrade).

## Qué cambia

**Nueva feature de plan: `menu_images`**
- Se agrega a `src/lib/subscriptionTiers.ts` dentro de las features de Profesional (y por herencia Premium).
- Se actualizan los bullets/highlights: Básico "Menú de texto", Profesional/Premium "Menú completo con fotos", y una fila nueva en la tabla comparativa ("Fotos en el menú": — / Sí / Sí).

**Base de datos**
- Columna `image_url text` (nullable) en `menu_items`.
- Bucket público `menu-images` con políticas: lectura pública; subir/actualizar/borrar solo el dueño (primera carpeta = `auth.uid()`), mismas restricciones de extensión que `event-images`.

**Editor del menú (`MenuEditor.tsx` / `EditMenuSheet.tsx`)**
- Cada ítem muestra un thumbnail cuadrado (72px, `rounded-xl`) a la izquierda; si no hay foto, un placeholder con ícono.
- Al tocar el thumbnail se abre el selector de archivo; la imagen se comprime a WebP con el helper existente (`mediaCompression` / `imageOptimization`), se sube a `menu-images/{userId}/{itemId}.webp` y se guarda `image_url`.
- Acción para quitar la foto (borra el objeto del storage y limpia la columna).
- Para negocios en Básico, todo ese bloque va envuelto en `LockedFeature feature="menu_images"`: se ve atenuado, no interactivo, con la etiqueta "Disponible en el plan Profesional" que abre el `PlansSheet`.

**Vista pública (`MenuSheet.tsx`)**
- Si el ítem tiene `image_url`, se muestra el thumbnail a la izquierda del nombre/descripción, con `loading="lazy"` y fallback al layout actual cuando no hay foto.
- Si un negocio baja a Básico, las fotos se pierden: dejan de verse en el menú público y el ítem vuelve a ser solo texto. Las URLs almacenadas se limpian (`image_url` a NULL) y se borran los archivos del bucket para no acumular imágenes huérfanas.

**Hook `useMenu.ts`**
- `MenuItem` incluye `image_url`; `useUpdateMenuItem` acepta `image_url`.

## Notas técnicas
- Límite de subida: 5 MB antes de comprimir, salida WebP máx. 800px de lado, calidad 0.8.
- El gating usa `useSubscriptionTier(user.id).hasFeature("menu_images")`; negocios que no son de comida no se ven afectados (el hook ya devuelve `true` para ellos).
- Al borrar un ítem del menú se borra también su imagen del storage.
