# Pagos con tarjeta (Qhantuy Cybersource) en todos los flujos

## Qué dice la documentación que subiste (v11.0.2)

El mismo endpoint que ya usamos, `/v2/checkout`, soporta tarjeta. Solo cambian dos campos:

- `payment_method`: `QRSIMPLE` (lo actual), `CYBERSOURCE` (tarjeta), o `ALL` (Qhantuy muestra una página con todos los métodos).
- `payment_type`: obligatorio con `CYBERSOURCE`. Puede ser `REDIRECT` (Qhantuy genera un `payment_url` y el usuario paga en la pasarela) o `EMBED` (nosotros mandamos número de tarjeta, vencimiento y CVV en la request).

Todo lo demás se mantiene igual: `custom_payouts` (nuestro 94/6), `internal_code`, `callback_url` y el callback GET con `status=success`. Es decir, la comisión y la confirmación ya funcionan tal cual para tarjeta.

## Redirect vs Embed: la recomendación es REDIRECT

`EMBED` obliga a que los datos de tarjeta pasen por nuestro formulario y nuestro servidor. Eso nos mete de lleno en alcance PCI DSS SAQ D (auditoría anual, escaneos, responsabilidad legal por los datos), y la documentación no incluye ningún campo tipo Microform o hosted fields que evite ese paso. No vale la pena por un formulario un poco más bonito.

`REDIRECT` nos deja fuera del alcance PCI, Qhantuy maneja el 3D Secure y las tarjetas rechazadas, y ya devuelve el `payment_url` listo para abrir.

## Sobre "guardar la tarjeta" y cobro recurrente automático

Acá tengo que ser directo: **la documentación v11.0.2 no permite hacerlo todavía.**

En un ejemplo de respuesta aparece un campo `tokenized_card` (en `null`), pero no está documentado en ninguna tabla de parámetros, no hay ningún campo de entrada para enviar un token guardado, y no existe endpoint para cobrar contra una tarjeta ya registrada. Sin eso no se puede hacer ni pago de un toque ni débito automático mensual: cada cobro sigue requiriendo que el usuario ingrese la tarjeta.

Antes de prometer suscripción automática hay que preguntarle a Qhantuy tres cosas concretas: si `tokenized_card` está habilitado para nuestro comercio, si existe un parámetro de entrada para pagar con ese token, y si soportan transacciones iniciadas por el comercio (MIT) para recurrencia. Si la respuesta es sí, la recurrencia se agrega después sin rehacer nada de lo de abajo.

## Qué se construye ahora

**1. Selector de método de pago**

Antes de generar el cobro, un bottomsheet nuevo (`PaymentMethodSheet`) con dos opciones: "Pagar con QR" (lo actual) y "Pagar con tarjeta". Aplica a entradas, experiencias y planes de suscripción.

**2. Backend: un solo cambio compartido**

Las tres funciones que ya generan cobros (`generate-qhantuy-qr`, `generate-experience-qr`, `generate-subscription-qr`) reciben un parámetro nuevo `method: "qr" | "card"`. Se extrae la construcción del body a un helper en `_shared/qhantuy.ts` para no repetir lógica:

- `qr` → exactamente lo de hoy.
- `card` → `payment_method: "CYBERSOURCE"`, `payment_type: "REDIRECT"`, más `return_url` apuntando a la pantalla de resultado que ya corresponde a cada flujo. Se devuelve `paymentUrl` en vez de `qrImageUrl`.

Los montos, el split 94/6 y el registro en `payment_sessions` no cambian.

**3. Frontend**

- Si el usuario elige tarjeta, se abre el `payment_url` de Qhantuy y al volver cae en la pantalla de confirmación que ya existe (entrada, reserva de experiencia o plan activado).
- El polling de estado que ya tenemos (`check-qhantuy-payment-status`) sigue funcionando igual, así que si el usuario cierra la pasarela y vuelve solo, igual ve el estado correcto.
- Suscripciones: se agrega "Pagar con tarjeta" junto a "Pagar con QR" en `PlanConfirmSheet`, y se corrige el texto "Pagás con QR desde tu banco" para que refleje ambas opciones. Sigue sin débito automático: el aviso previo a la renovación se mantiene.

**4. Registro**

Se guarda en `payment_sessions` el método usado (columna nueva `payment_method`) para poder ver en el panel admin cuánto entra por QR y cuánto por tarjeta.

## Notas técnicas

- El callback (`qhantuy-callback`) no necesita cambios: valida `internal_code` + `transaction_id` + `status`, igual para ambos métodos.
- Con 3DS, Qhantuy responde `payment_status: "holding"` y confirma después por callback — el flujo de espera que ya existe cubre ese caso.
- Se mantiene QR como opción permanente, no como fallback temporal: en Bolivia sigue siendo el método más usado y sin costo de tarjeta.

## Fuera de alcance en este pase

Guardado de tarjeta, pago de un toque y débito automático, hasta que Qhantuy confirme soporte de tokenización y MIT.
