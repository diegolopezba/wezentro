# Fix: el sheet de "Editar área" del organizador no deja scrollear

## Estado confirmado leyendo el código

- `AreaEditSheet.tsx` (el sheet de agregar/editar mesa del dueño) **ya tiene la estructura correcta**: header fijo, cuerpo con `flex-1 min-h-0 overflow-y-auto overscroll-contain` + `data-vaul-no-drag`, y footer fijo con Guardar/Duplicar/Eliminar.
- Construí una reproducción mínima con la misma versión de vaul (0.9.9) y la misma estructura, y en Chromium el gesto táctil **sí scrollea** (scrollTop sube, el sheet no se mueve). O sea: el patrón actual funciona en Android/Chrome.
- La librería vaul inyecta `touch-action: none` sobre el drawer y hace `setPointerCapture` en cada toque, lo que en iOS (Safari / app nativa con WKWebView) es una fuente conocida de scroll roto en drawers — y la app publicada/instalada puede además estar corriendo un build viejo, anterior al fix de este sheet (hay varios cambios sin publicar).

**Diagnóstico no confirmado del todo:** no puedo emular iOS en este entorno. El plan arranca verificando el comportamiento real en el preview.

## Pasos

### 1. Verificar el comportamiento actual (diagnóstico)
- Con Playwright (viewport móvil táctil, sesión de prueba), abrir el editor de planos del negocio (`/settings/business` → planos / creación de evento), abrir "Editar área" y hacer swipe sobre el formulario midiendo `scrollTop` antes/después, y sobre el header (debe arrastrar el sheet).
- Resultado A: scrollea bien → el bug está en el build publicado o es específico de iOS → ir a paso 2 y 3.
- Resultado B: no scrollea → reestructurar el contenido del sheet (mismo patrón probado en la reproducción) hasta que scrollee.

### 2. Endurecer el sheet contra iOS/app nativa
Según lo que muestre el paso 1, aplicar en `src/components/ui/bottom-sheet.tsx` y/o `AreaEditSheet.tsx`:
- Agregar `handleOnly` al `Drawer.Root` de este sheet (vaul 0.9.9 lo soporta): el sheet solo se arrastra desde el handle/header, y los gestos sobre el formulario nunca lo mueven — elimina el síntoma "se cierra solo".
- Si iOS sigue sin scrollear: subir vaul a la última versión 1.x (corrige varios bugs de scroll anidado en Safari) verificando que el resto de los sheets de la app sigan iguales, o agregar un guard que evite el `setPointerCapture` de vaul dentro de zonas `data-vaul-no-drag`.

### 3. Publicar
- El usuario prueba en el teléfono contra la app publicada; sin publicar, cualquier fix es invisible para él. Publicar al final y pedirle que reabra la app.

## Verificación
- Typecheck (`npx tsgo --noEmit`).
- Playwright móvil: el formulario scrollea, el handle arrastra/cierra, Guardar siempre visible.
- Confirmación del usuario en su teléfono tras publicar.

## Alcance
Solo el sheet de editar/agregar área del organizador (y el wrapper de bottom-sheet si hace falta). Sin cambios en lógica de guardado, planos, ni en el flujo de compra.
