## Boletería en puerta
- [x] Cartel QR permanente, precios administrables y compra sin cuenta de 1 a 10 entradas.
- [x] Pago bancario, comisión y emisión de QR individuales verificables por el escáner existente.
- [x] Visor claro con carrusel y actualización de entradas usadas; ventas en puerta en Gestión.
- [x] Botones negros, confirmación verde, compras adicionales y nombre/estado de cada entrada.
- [ ] Verificar un cobro real completo con Qhantuy y escaneo en un evento de prueba (requiere transacción bancaria real).

## Onboarding con foto y Business sin datos personales
- [x] Foto obligatoria en el onboarding personal y Business, con carga y reintento.
- [x] Quitar género y fecha de nacimiento para Business también en Editar perfil.
- [ ] Verificar ambos recorridos con una sesión real en teléfono y escritorio (bloqueado: no hay cuenta del solicitante para iniciar sesión en la vista previa).

## Recorrido Business por las pantallas de Zentro
- [x] Bienvenida y pasos guiados por Inicio, Crear, Gestión, Perfil y Business.
- [x] Punteros animados y pestaña de Gestión adaptada al tipo de negocio.
- [x] Verificar el recorrido completo con una cuenta Business en teléfono y escritorio.

## Compra unificada + comisión de gateway (hecho)
- [x] Hoja única de compra con entradas (tiers) y áreas/lounges a la vez.
- [x] Comisión de Qhantuy (1%) cobrada al comprador; solo el 94% del organizador usa `custom_payouts` y el 6% de Zentro permanece en el saldo del comercio.
- [x] Desglose subtotal / comisión / total en entradas, experiencias y planes.

## Lounges: info extra, preguntas al comprador y compra en pantalla completa (hecho)
- [x] Descripción, beneficios y nota de llegada por área (plantilla y evento).
- [x] Preguntas configurables al comprar un lounge (texto, teléfono, sí/no, opciones) desde Editar evento.
- [x] Compra en pantalla completa multi-paso (elegir → datos → pagar) en lugar del bottom sheet.
- [x] Gestión: respuestas del comprador visibles en las reservas de lounge.
- [x] Comprador: tarjeta de lounge en Entradas con detalle, beneficios, nota de llegada y plano.
- [x] Email `lounge-confirmed` al confirmar el pago del área.

## Navegación persistente (hecho)
- [x] Evitar el destello de la barra inferior al abrir páginas sin navegación móvil.
- [x] Mantener el espacio del menú lateral en Notificaciones para que no cubra contenido.

## Estabilidad del feed Para Ti
- [x] Evitar que fallos temporales o una función desactualizada dejen Inicio en blanco.
- [x] Desplegar y comprobar las funciones del feed en staging.
