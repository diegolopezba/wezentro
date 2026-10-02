# Escáner listo para Cábala by WhyNot (hoy)

## Lo que ya revisé

- Cábala tiene 181 entradas, todas aprobadas y todas con su código QR propio: 119 compradas para el propio comprador, 38 compradas para otras personas, 23 invitaciones especiales (1 ya ingresó). No hay entradas sin QR, pendientes ni rechazadas.
- El enlace del escáner del evento existe y es válido.
- Todos los QR (Mis entradas, "Vas a ir", carrusel de varias entradas, puerta) contienen el mismo tipo de código, y el escáner verifica todos con la misma lógica: fases, precio único, invitaciones especiales, entradas compradas para otros y ventas en puerta.
- Cada QR sirve una sola vez, aunque dos escáneres lo lean al mismo tiempo: uno marca "Ingresó" y el otro "Ya ingresó".

## Problemas encontrados para arreglar antes del evento

1. **Entradas compradas para otra persona (38 en Cábala):** el escáner las acepta, pero no muestra ningún nombre. El portero ve "Ingresó" sin saber de quién es. Se va a mostrar el nombre del invitado o "Invitado de [comprador]".
2. **El escáner no muestra qué entrada es:** se va a agregar el tipo debajo del nombre (Fase 1, Fase 2, Precio único, Invitado especial, Puerta + nombre de la entrada, Lounge), para que el portero pueda distinguir VIP de general.
3. **Lectura más tolerante:** hoy el lector solo busca QR oscuros sobre fondo claro. Lo voy a ajustar para que también lea QR con poco brillo o capturas invertidas, y para que lea más rápido en teléfonos lentos.
4. **"Ya ingresó" de las invitaciones especiales y de algunos casos simultáneos** a veces no muestra la hora ni el nombre. Se va a mostrar siempre nombre y hora del primer ingreso.
5. **Errores más claros para el portero:** distinguir "QR de otro evento", "Entrada cancelada / no aprobada", "Sin conexión, reintentá" (con botón Reintentar que vuelve a leer el mismo QR) y vibración distinta para válido / usado / inválido.
6. **Pantalla verde/amarilla/roja grande:** fondo de color completo según el resultado, para que se entienda de un vistazo con poca luz.

## Verificación antes de entregarlo

- Prueba con un evento de prueba: generar un QR de cada tipo (fase, precio único, compra para otro, invitación especial, puerta), escanear cada uno dos veces y confirmar "Ingresó" y después "Ya ingresó".
- Probar QR de otro evento y QR inventado: tiene que aparecer "QR inválido".
- Confirmar con la base de datos que las 181 entradas de Cábala pasarían la verificación (sin marcarlas como ingresadas).
- Revisar el escáner en tamaño de teléfono.

No se tocan los números, ventas ni entradas existentes; solo se mejora lo que ve el portero.

## Detalles técnicos

- `check-in-guest`: devolver `guest_name`, `purchased_by` (perfil del comprador), `entry_label` (tier name / gate_offer_name / special_guest_label / area name / "Precio único"), `checkedInAt` siempre en alreadyUsed (incluido el camino de carrera y special invites), y `code` de error (`wrong_event`, `not_approved`, `revoked`, `not_found`). Para `wrong_event`, buscar el token sin filtro de evento.
- `ScanQR.tsx`: `inversionAttempts: "attemptBoth"`, reducir el canvas a ~640px de ancho, botón Reintentar en error de red que reenvía el último token, haptics por estado, overlay a pantalla completa con tokens semánticos (success / warning / destructive), mostrar `entry_label`.
- Redeploy de `check-in-guest`; sin migraciones.
