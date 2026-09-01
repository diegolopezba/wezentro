# Arreglar el pago con tarjeta en todos los flujos

## Qué encontré

Tus 3 intentos quedaron registrados en la base de datos, y los tres se guardaron como **pago con QR**, no con tarjeta:

```text
19:22:52  Bs. 250  basico  payment_method: qr  transacción 4333128
19:23:09  Bs. 250  basico  payment_method: qr  transacción 4333130
19:24:04  Bs. 250  basico  payment_method: qr  transacción 4333137
```

Es decir: el cobro sí se creó en Qhantuy, pero como QR. La app pidió tarjeta, recibió un QR sin `payment_url`, y por eso mostró "No pudimos iniciar el pago con tarjeta".

El código de las funciones de cobro que está en el proyecto sí maneja tarjeta correctamente (`payment_method: CYBERSOURCE`, `payment_type: REDIRECT`, y guarda `payment_method: "card"`). Como las sesiones quedaron en `qr` — que es justo el valor por defecto de la columna cuando la función no lo manda — todo apunta a que **las funciones desplegadas en el servidor son la versión anterior, sin soporte de tarjeta**. El código nuevo nunca llegó a producción.

## Qué voy a hacer

1. **Volver a desplegar las tres funciones de cobro** con el código actual: planes (`generate-subscription-qr`), entradas de eventos (`generate-qhantuy-qr`) y experiencias (`generate-experience-qr`), junto con el módulo compartido de Qhantuy.

2. **Probar cada una en vivo**, con tarjeta y con QR, y confirmar en la base de datos que la sesión queda guardada con el método correcto y que llega un `payment_url` real de Qhantuy en el caso de tarjeta. No doy esto por cerrado hasta ver la respuesta real de Qhantuy en los tres flujos.

3. **Si Qhantuy rechaza Cybersource** (por ejemplo, si el método no está habilitado para el comercio), lo voy a ver en la respuesta y te lo informo con el mensaje exacto de ellos, porque en ese caso es una habilitación del lado de Qhantuy y no algo que se arregle en el código.

## Mejoras de diagnóstico (para que no vuelva a pasar en silencio)

- Cuando Qhantuy devuelva un error, mostrar su mensaje real en la app en vez del texto genérico "Intentá de nuevo".
- Registrar en los logs de cada función el método pedido y la respuesta cruda de Qhantuy cuando falla, para poder ver al instante si el problema es de la pasarela o nuestro.
- Cuando se pide tarjeta y Qhantuy responde sin `payment_url`, marcar la sesión como fallida con un motivo claro en lugar de dejarla pendiente.

## Notas técnicas

- La columna `payment_sessions.payment_method` ya existe con restricción `qr | card` y default `qr`; ese default es lo que delató la versión vieja.
- El reparto 94/6 (`custom_payouts`), el `internal_code` y el callback no cambian: son iguales para ambos métodos, así que no hay riesgo para los cobros por QR que ya funcionan.
- El polling con `check-qhantuy-payment-status` sigue igual, así que si el usuario cierra la pasarela y vuelve, la pantalla se actualiza sola.
