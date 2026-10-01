# Recorrido Business por las pantallas de Zentro

## Resultado

Después de «Completar después» o «Listo, ir a mi cuenta Business», la cuenta llega a Inicio y ve una pequeña hoja inferior de bienvenida: «Bienvenidos a Zentro, tranqui, te vamos a hacer el tour para que aprendas todo en 5 min» y «Comenzar». El recorrido visita las pantallas reales de la aplicación, no solo los íconos del menú. La imagen adjunta sirve de referencia para una tarjeta con una pequeña flecha orientada al elemento destacado; no se inserta como imagen en la aplicación.

## Recorrido

1. **1/5 · El homepage (Inicio):** «Aquí encontrás todo lo que está pasando alrededor tuyo. Cada publicación es un evento, experiencia o lugar nuevo por conocer.» «Continuar» abre **Crear** (según tu aclaración).
2. **2/5 · Crear eventos o publicaciones:** «Desde aquí publicás todos tus eventos, publicaciones o experiencias.» La tarjeta señala el selector de tipos de publicación de la pantalla Crear. «Continuar» abre **Gestión**.
3. **3/5 · Página de Gestión:** abre la pestaña relevante y señala su título: **Eventos** para boliches, organizadores, festivales y conciertos; **Reservas** para restaurantes, bares y cafés; **Experiencias** para negocios de experiencias (p. ej., Viñedos y paracaidísmo). Usa el texto correspondiente a eventos y ventas; reservas y mesas; o bookings y fechas. Para negocios sin categoría definida, muestra Eventos como opción general. «Continuar» abre **Perfil**.
4. **4.1/5 · Tu perfil:** señala la zona de publicaciones del perfil y muestra el texto indicado sobre orden cronológico y seguidores. «Continuar» pasa a **4.2/5 · Botón de info**, señala el botón de información y explica horarios, ubicación y contacto; «Continuar» abre **Configuraciones Business**. Si el negocio aún no completó esos datos y el botón no existe, la explicación se muestra junto al encabezado del perfil sin señalar un control inexistente.
5. **5/5 · Configuraciones Business:** destaca los ajustes reales del negocio y muestra el texto indicado sobre pagos, mesas, analíticas, menú, reservas y experiencias. «Listo» marca el tour como terminado y regresa a Inicio.

No habrá «Omitir», cierre con X ni cierre al tocar fuera en ninguna etapa del recorrido. La hoja de bienvenida tampoco tendrá un botón para saltarlo.

## Presentación y continuidad

- Mantener la estética oscura de Zentro: tarjeta compacta, flecha triangular que apunte al elemento visible, velo tenue y contorno destacado. Transiciones suaves al mover el foco y cambiar de pantalla, con menos movimiento si el dispositivo lo solicita; sin efectos de hover.
- Ubicar la tarjeta sin tapar el objetivo ni los controles inferiores y adaptarla al menú inferior del teléfono y al lateral de escritorio. Si falta un objetivo o aún está cargando, mostrar la tarjeta en posición segura y evitar señalar al lugar equivocado.
- Conservar el estado entre pantallas y recargas por cuenta: reanudar en el paso correspondiente si se interrumpe; marcar como completado únicamente al pulsar «Listo». La versión renovada se mostrará una vez a cada cuenta Business, incluso si completó el tour anterior. No alterar el recordatorio existente para terminar de configurar el negocio.

## Detalles técnicos

- Situar el controlador del recorrido dentro del contenedor compartido de las pantallas de la app, no dentro de Inicio, para que no se desmonte durante la navegación. Mantener la activación desde la configuración inicial y distinguir progreso de finalización con una clave versionada por usuario.
- Añadir objetivos estables a los controles reales de Crear, Gestión, Perfil y Business; seleccionar la pestaña de Gestión según `business_type` sin modificar permisos ni contenido. El botón de información del perfil solo se muestra cuando hay datos del negocio; respetar esa condición.
- No requiere cambios de base de datos ni de pagos.

## Comprobación

Probar el recorrido completo con una cuenta Business en teléfono y escritorio: bienvenida → Inicio → Crear → Gestión (cada categoría) → Perfil → Info → Business → Inicio; confirmar posición de la flecha, controles visibles, reanudación tras recarga y finalización definitiva.