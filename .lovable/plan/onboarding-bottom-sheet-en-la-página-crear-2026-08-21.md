# Onboarding bottom-sheet en la página Crear

Sí, es una buena idea. El selector actual de `Post / Evento` muestra solo una línea de descripción y no explica qué pasa cuando el negocio vincula una experiencia. Un onboarding contextual al entrar a `Crear` reduce publicaciones mal categorizadas y refuerza el flujo de conversión a Business.

## Scope (conservador)

Mantener el selector actual con dos opciones (`Post`, `Evento`) y explicar las tres modalidades de contenido desde la hoja: Post, Evento y Evento con Experiencia vinculada. No se agrega un tercer tipo de contenido por ahora.

## Qué se va a construir

1. **Nuevos pasos de onboarding** en `src/components/business/featureIntroSteps.ts`:
   - `CREATE_INTRO`: 3 slides.
     - **Post**: comparte momentos, aventuras o contenido. Puede mostrar botón de menú o reservas si tenés un negocio.
     - **Evento**: fecha, lugar, lista de invitados y/o entradas. Ideal para fiestas, shows, productos.
     - **Experiencia**: un evento vinculado a una experiencia con horarios, opciones y pago QR. Para tours, clases, buceo, cata, etc.

2. **Integración en `src/pages/Create.tsx`**:
   - Importar `FeatureIntroSheet` y `useFeatureIntro`.
   - Abrir automáticamente la hoja la primera vez que el usuario entra a `Crear` (`useFeatureIntro("create")`), persistido en `localStorage`.
   - Agregar un botón de ayuda (`HelpCircle`) en el header a la derecha del título para reabrir la hoja.
   - Asegurar que la hoja no se abra si ya se está mostrando otra hoja (por ejemplo, `BeneficiaryRequiredSheet` o `BusinessRequiredSheet`) al entrar desde un estado externo.

3. **Ajustes menores de copy**:
   - Aprovechar para aclarar el hint de `Reservar una experiencia` en la card existente, si hace falta.
   - No se modifica el selector visual ni se crea un tercer tipo de contenido.

## No incluye

- No se agrega un tercer tipo de contenido (`ContentType`) por ahora.
- No se modifica la lógica de guardado, `is_post`, `events.experience_id`, ni el flujo de pagos.
- No se crea un nuevo componente de onboarding: se reutiliza `FeatureIntroSheet`.

## Validación

- Verificar que la hoja se abre solo la primera vez en un navegador limpio.
- Verificar que el botón `?` del header reabre la hoja.
- Verificar que el selector de Post/Evento sigue funcionando igual.
