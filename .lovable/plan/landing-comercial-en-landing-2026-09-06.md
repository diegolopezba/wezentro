# Landing comercial en /landing

Una página web (solo navegador, nunca dentro de la app nativa) para convertir dueños de negocios en cuentas Business, y que además funcione como deck de venta para agentes.

## Estructura

`/landing` — sección común para los tres públicos:
- Hero oscuro: "El Pinterest de la vida social" + subtítulo + dos botones: "Crear mi cuenta Business" y "Agendar una demo".
- El problema: 35% de las ventas potenciales se pierden cada semana (reservas manuales, listas por WhatsApp, cero data, config lenta, sin interacción en tiempo real).
- Qué es Zentro: red social + marketplace de experiencias = ecosistema completo. Lista de capacidades.
- Por qué no somos una ticketera ni una página de reservas: algoritmo, base de datos, cross-benchmarking, hasta 35% más de venta.
- TikTok / Instagram / Zentro se complementan (comunicación / comunidad / discovery, ventas y data).
- Tres botones grandes que llevan a las secciones específicas: **Eventos**, **Restaurantes**, **Experiencias**.
- Prueba de flujo: de la foto a la reserva/compra sin salir de la app.
- Formulario de demo + CTA final con WhatsApp, Instagram y TikTok.

`/landing/eventos`
- Ticketing y management, entradas con QR y control de ingreso, guestlists, invitaciones masivas (hasta 2000), RRPP/promotores, lounges y mesas por evento, waiting list, notificaciones push, analíticas y embudo, pagos QR y tarjeta.
- Precio: 6% de comisión por entrada vendida, sin mensualidad ni costos de configuración.
- CTA: crear cuenta Business / agendar demo.

`/landing/restaurantes`
- Reservas sin llamadas, disponibilidad en tiempo real, recordatorios automáticos, menú interactivo, contenido estilo Pinterest que convierte, analíticas de reservas, turnos, fan base.
- Comparativa de planes Básico Bs. 250/mes (Bs. 8 por día, hasta 9 mesas), Profesional Bs. 300/mes (Bs. 10 por día, hasta 20 mesas), Premium Bs. 500/mes (Bs. 17 por día, mesas ilimitadas, prioridad en discovery, insights de ciudad), con nota de 6% en eventos y experiencias con ticketing.
- FAQ: ¿hay comisión por reserva?, ¿cómo se paga?, ¿puedo cancelar?, ¿cuándo recibo mi dinero?, ¿necesito hardware?
- CTA: elegir plan / agendar demo.

`/landing/experiencias`
- Experiencias como publicación propia, cupos y horarios, preguntas al comprador, cobro anticipado, check-in, reseñas de asistencia y data del público.
- Precio: 6% por entrada vendida.
- CTA igual.

## Diseño

Hero y secciones narrativas oscuras (fondo de la app, tipografía Poppins grande, tarjetas con borde suave); bloques de planes, comparativas y FAQ en superficie clara para que se lean bien proyectados. Rojo de marca solo en acentos puntuales. Animaciones de entrada suaves al hacer scroll. Responsive: una columna en móvil, dos/tres en escritorio.

## Español + inglés

Selector ES/EN arriba a la derecha. Todo el texto vive en un archivo de contenido con las dos versiones; el idioma elegido se recuerda en el navegador.

## Modo presentación

Botón "Modo presentación": convierte la página en diapositivas a pantalla completa, una sección por diapositiva, con flechas del teclado, clic y swipe, contador de diapositivas y salida con Escape. Mismo contenido, sin duplicar textos.

## Captura de leads

- Formulario: nombre, negocio, tipo de negocio (eventos / restaurante / experiencias), teléfono/WhatsApp, email opcional, mensaje. Se guarda en una tabla nueva `business_leads` y se envía un email de aviso.
- Botones directos de WhatsApp a +591 77622635 e Instagram/TikTok @wearezentro en el cierre de cada sección.

## Notas técnicas

- Rutas nuevas fuera del `AppLayout`: `/landing`, `/landing/eventos`, `/landing/restaurantes`, `/landing/experiencias`, todas públicas y con lazy loading.
- Solo navegador: si `Capacitor.isNativePlatform()`, `/landing` redirige a `/`. Además no se agrega ningún enlace desde la navegación de la app.
- Archivos nuevos en `src/pages/landing/` y `src/components/landing/` (hero, bloques de valor, comparativa de planes, FAQ, formulario, modo presentación, selector de idioma). Los precios se leen de `src/lib/subscriptionTiers.ts` para no duplicar datos.
- CTA "Crear mi cuenta Business" reutiliza el flujo existente: `setBusinessIntent()` y `/auth` en modo registro Business.
- Migración: tabla `public.business_leads` con RLS (inserción pública anónima, lectura solo admin) y los GRANT correspondientes; edge function para el email de aviso.
- SEO: título y descripción propios, encabezado único, texto alternativo en imágenes, JSON-LD de organización.
