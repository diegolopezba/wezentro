# Rediseño del onboarding Business

Transformar `/business` en una experiencia visual de seis pantallas, inspirada en el ritmo del ejemplo: una imagen dominante, una sola promesa clara y muy poco texto por pantalla.

## Dirección elegida

- Fondo blanco, superficies gris suave, texto casi negro y rojo Zentro para acciones y progreso.
- Titulares grandes, redondeados y amigables; texto secundario breve y legible.
- Composición vertical: aproximadamente 58% visual, seguido por progreso, mensaje y navegación fija.
- Sin listas de funciones ni tarjetas apiladas. La captura compartida será solo referencia, no se mostrará dentro de la app.

## Las seis pantallas

1. **Hacé que encuentren tu negocio**  
   “Mostrá dónde estás, tus horarios y cómo contactarte.”  
   Visual: perfil de negocio rodeado por un mapa y señales de descubrimiento.

2. **Publicá lo que está por pasar**  
   “Creá eventos y experiencias que la gente quiera vivir.”  
   Visual: una publicación central con pequeñas escenas de evento y experiencia orbitando.

3. **Vendé entradas sin complicarte**  
   “Cobrá online y validá cada ingreso con QR.”  
   Visual: entrada digital que se transforma en un QR confirmado.

4. **Recibí reservas mientras atendés**  
   “Tu menú y tus horarios trabajan por vos, incluso cuando estás ocupado.”  
   Visual: menú, calendario y confirmación alrededor de una mesa central. El texto deja claro que estas funciones dependen de un plan.

5. **Entendé qué hace crecer tu negocio**  
   “Mirá ventas, audiencia y rendimiento desde un solo lugar.”  
   Visual: indicadores simples que convergen en un panel central.

6. **Empezá con un modelo claro**  
   “Eventos: 6% por venta. Menú y reservas: planes desde Bs. 250 al mes.”  
   Visual: dos caminos sencillos — vender entradas o activar herramientas con plan — más una nota corta de activación gratis.

## Interacción

- Mantener swipe horizontal, botón Atrás, progreso de seis puntos y vibración ligera.
- Reemplazar “Saltar y crear mi cuenta” por “Omitir” arriba, como en la referencia; lleva directamente al mismo inicio de cuenta Business.
- Botón rojo de ancho completo: “Siguiente” y, al final, “Crear mi cuenta Business”.
- Animar cada visual con una entrada suave y pequeñas piezas flotantes; respetar movimiento reducido.
- Adaptar alturas para teléfonos pequeños sin que el texto o los botones se superpongan; en escritorio, centrar la experiencia con un ancho móvil limpio.

## Implementación técnica

- Rediseñar únicamente `BusinessLanding`; no cambiar autenticación, intención Business, registro, rutas, precios ni configuración posterior.
- Crear un componente visual pequeño y reutilizable por pantalla para mantener el archivo legible, usando iconos y composiciones CSS propias, no imágenes genéricas.
- Usar tokens semánticos para blanco, gris, texto y rojo Zentro; sin colores directos dentro del componente.
- Aplicar el tratamiento tipográfico Outfit/Figtree elegido únicamente a esta experiencia mediante fuentes empaquetadas, sin alterar el resto de Zentro.
- Mantener todos los botones con los componentes existentes y conservar los estados para usuario nuevo, usuario personal y cuenta Business existente.

## Validación

- Revisar las seis pantallas en 393×822 y escritorio.
- Comprobar swipe, Atrás, Omitir, progreso y CTA final.
- Confirmar que cada pantalla comunica una sola idea y que ninguna tiene scroll, cortes ni solapamientos.
- Confirmar que la navegación conserva exactamente el flujo Business actual.
