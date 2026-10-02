# Gestión › Eventos: entradas claras por categoría

## Resultado
- Cambiar **Vendidas** por **Total asistentes** en la cabecera del evento. Ese número incluirá entradas vendidas y las invitaciones aceptadas; las cortesías manuales, si existen, se mostrarán por separado para que el total sea comprobable.
- Quitar la tarjeta grande de **Total de entradas emitidas** de la pestaña Entradas. En su lugar, poner una franja compacta encima de las categorías: **Entradas vendidas + Invitaciones aceptadas** (y cortesías manuales cuando correspondan) = **Total asistentes**. Las invitaciones enviadas pero no aceptadas no suman asistentes.
- Recuperar el diseño anterior de una fila por categoría: **Precio único** cuando aplique, y **Fase 1, Fase 2, etc.** por su nombre real. Cada fila mostrará precio, cantidad vendida / capacidad, ingresos de esa categoría y barra visual de ocupación; conservar las etiquetas de casi agotado y agotado.
- Mantener las ventas de puerta y entradas de lounge identificadas aparte cuando existan, sin mezclarlas con fases. Conservar el conteo de invitaciones enviadas y aceptadas en la sección Invitados, sin tratarlas como ventas.

## Detalles técnicos
- Ajustar `EventTiersPanel` y `EventDetailPanel` para compartir el mismo desglose autorizado del evento y no calcular el encabezado con una métrica distinta a la franja. Mostrar estados de carga y error en lugar de cero cuando falle el desglose.
- Completar `get_event_entry_breakdown` para devolver también tipos configurados sin ventas, precio del evento para **Precio único** y capacidad por tipo cuando exista. Atribuir ingresos únicamente a pagos confirmados y evitar duplicar sesiones entre categorías.
- Comparar las cifras resultantes de Cábala y otro evento con las entradas e invitaciones registradas; probar la vista en móvil y escritorio, incluida una entrada sin capacidad configurada.
