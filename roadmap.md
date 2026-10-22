## Datos de facturación
- [x] Datos privados guardados, historial por compra y validación antes de pagar entradas.
- [x] Slide dedicado en compra y edición desde Configuración.
- [x] Aviso a compradores anteriores desde sus entradas y exportación por compra para el organizador; no se enviaron correos.
- [x] Pruebas de datos obligatorios y regresiones de descuentos y ventas.
- [ ] Comprobar guardado y compra con una cuenta personal: la sesión disponible es Business y no puede comprar; formulario autenticado y 14 pruebas pasan, faltan datos fiscales reales y pago bancario.

## SCZ Week: ventas por pase y edición segura
- [x] Conservar los identificadores y ventas de entradas al editarlas; archivar las retiradas (pruebas de regresión verificadas).
- [x] Contar pases originales, sin duplicar QR por día, y corregir el balance de invitaciones.
- [x] Reconectar seis compras verificadas de SCZ Week: 9 pases, Bs. 3.600 y 18 QR diarios; vista privada del organizador comprobada.

## Gestión > Eventos: entradas y asistentes
- [x] Recuperar filas por precio único y fase con precio, ventas, capacidad y barra visual; quitar la tarjeta de entradas emitidas.
- [x] Mostrar total asistentes y desglose compacto de entradas vendidas, invitaciones aceptadas y cortesías.
- [x] Identificar entradas pagadas antiguas sin sesión enlazada para que no figuren como cortesías; contrastar BRUNCH RAVE con sus ventas e invitaciones.
- [ ] Verificar la vista privada de Cábala con una sesión autorizada de su organizador (la sesión de prueba no tiene acceso a ese evento).

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

## Códigos de descuento para el comprador
- [x] Fila "¿Tenés un código de descuento?" dentro de la hoja de compra; solo aparece si el evento tiene códigos activos que aplican a la entrada elegida.
- [x] Al aplicarlo: píldora verde "Código X aplicado" con Quitar, línea "Descuento (X)" en el desglose y total recalculado.
- [x] Comprobado de punta a punta en SCZ Week: ZJ2DS y ZCIAY → Bs. 250 − 50 = Bs. 202,03 en el QR bancario; en Dark Garden (sin códigos) la fila no aparece.
- [ ] Quedan tres pagos de prueba sin cobrar en SCZ Week (ZCIAY, UFAWE ×2); se pueden ignorar o limpiar.
