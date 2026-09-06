# Landing más simple y visual, estilo dice.fm

Hoy la landing explica todo con texto: listas de chips, bullets, tarjetas de funciones. Queda densa y no se ve la app. La rehacemos con la lógica de dice.fm: pocas palabras, pantallas grandes de la app y un solo botón claro por bloque.

## Principio

Cada sección = 1 titular corto + 1 frase + 1 imagen grande de la app. Nada más. Si algo necesita tres bullets para entenderse, se corta o se convierte en imagen.

## Imágenes: capturas reales de la app

Tomo capturas reales de Zentro desde el navegador (cuenta de prueba) y las muestro dentro de un marco de teléfono sobre fondo oscuro, en tamaños grandes:

- Feed / descubrimiento (portada tipo Pinterest)
- Detalle de un evento con lounges y entradas
- Flujo de compra (elegir entrada → pagar con QR)
- Reserva de mesa en un restaurante
- Menú con fotos
- Gestión: reservas del día y detalle de evento
- Analíticas: embudo y ocupación

Las capturas se suben como archivos servidos por CDN, no pesan en el proyecto. Si alguna pantalla no tiene datos lindos para mostrar, te aviso y me pasás una captura tuya.

## Estructura nueva

`/landing` (portada)
1. Hero: titular grande + una frase + botón "Crear mi cuenta Business" + enlace "Agendar demo". A la derecha (o debajo en celular), teléfono con el feed.
2. Franja de 3 números: 35% de ventas perdidas · 6% por entrada · desde Bs. 250/mes. Sin párrafos.
3. Tres bloques alternados imagen/texto (imagen izquierda, luego derecha, luego izquierda): Descubrimiento · Venta · Datos. Cuatro palabras cada uno.
4. Tira horizontal de pantallas de la app (galería que se desliza).
5. Tres tarjetas grandes con imagen: Eventos · Restaurantes · Experiencias → llevan a sus páginas.
6. Formulario de demo, corto: nombre, negocio, WhatsApp. Los demás campos quedan opcionales detrás de "Agregar detalles".
7. Cierre con WhatsApp e Instagram.

`/landing/eventos`, `/landing/restaurantes`, `/landing/experiencias`
- Hero con imagen de la pantalla más representativa.
- 3 o 4 bloques alternados imagen/frase (en vez de la grilla de 6 tarjetas de texto).
- Precio: un número gigante (6% · o los tres planes en restaurantes) con una sola línea de respaldo.
- En restaurantes se mantienen las tarjetas de planes y las preguntas frecuentes, pero la tabla comparativa larga pasa a estar colapsada ("Ver comparación completa").
- Formulario + cierre.

## Qué se elimina

- La nube de chips "Qué es Zentro" (10 etiquetas).
- El bloque de ecuación "red social + marketplace =".
- La grilla de 6 tarjetas de problema y la lista "Tiempo / Dinero / Información".
- Las grillas de 6 tarjetas de funciones en cada página específica.
- El bloque TikTok / Instagram / Zentro (se resume en una línea dentro de "Descubrimiento").

Todo eso se reemplaza por imagen + titular. El contenido bilingüe se mantiene: se recorta el archivo de textos, no se duplica.

## Se mantiene

- Español / inglés con el selector.
- Modo presentación (queda mejor: una imagen grande por diapositiva).
- Botones a crear cuenta Business y WhatsApp.
- Guardado de leads y email de aviso.
- Invisible dentro de la app nativa.

## Notas técnicas

- Capturas con Playwright contra el preview local, en viewport de celular (390x844) y de escritorio para las pantallas de gestión; se suben con `lovable-assets` y se referencian por su pointer `.asset.json`.
- Componentes nuevos en `src/components/landing/`: `PhoneFrame.tsx` (marco de teléfono con la captura), `MediaSplit.tsx` (bloque alternado imagen/texto), `ScreenStrip.tsx` (galería horizontal), `StatBand.tsx`.
- Se simplifican `LandingBlocks.tsx` (se quitan `FeatureGrid` y `CommissionBlock` en su forma actual), `LandingHome.tsx`, `LandingEvents.tsx`, `LandingRestaurants.tsx`, `LandingExperiences.tsx`.
- `src/lib/landingContent.ts` se recorta: cada sección pasa a `title` + `line` + `image`, en ES y EN.
- `LeadForm.tsx`: tres campos visibles, el resto detrás de un desplegable; misma tabla y mismo email.
- Imágenes con `loading="lazy"`, `width`/`height` fijos y texto alternativo descriptivo para SEO.
