# Promotores: resultado de la verificación y ajuste de ingresos

## Resultado
Revisé las ventas confirmadas de cada promotor y las comparé con las entradas reales que se emitieron.

- **Tickets vendidos: son correctos.** Ahora se cuenta cada entrada, no cada compra. Por ejemplo, en Cábala:
  - Lucas Pacheco: 1 compra = **5 entradas**, y figuran 5.
  - Mathias Castro Urgel: 5 compras = **7 entradas**, y figuran 7.
  - Adrián Cubillo: 11 compras = **12 entradas**, y figuran 12.
  - Mario Rivera: 15 compras = 15 entradas.
  En todos los promotores de Cábala, la cantidad que se muestra coincide exactamente con las entradas QR emitidas.
- **Ingresos: un poco inflados (alrededor de 1%).** El monto suma lo que pagó el comprador, comisión bancaria incluida. Ejemplo: Mario Rivera muestra Bs. 848,55, pero sus entradas valen Bs. 840.
- "prueba 4 rrpp" tiene 1 venta de prueba de Bs. 2 sin entrada emitida. Es de tu evento de prueba y no afecta a Cábala.

## Cambio propuesto
1. Calcular los ingresos de cada promotor con el precio real de las entradas, sin la comisión bancaria. Así coinciden con los ingresos de la pestaña Entradas.
2. Aplicarlo en los dos lugares donde aparecen los promotores: la pestaña Promotores del evento y la vista general de promotores del Dashboard.

## Detalles técnicos
- En `get_event_promoter_stats` y `get_creator_promoter_leaderboard`, reemplazar `SUM(ps.amount)` por `SUM(COALESCE(ps.base_amount, ps.amount))`, mediante una migración que solo actualiza las funciones.
- `tickets_sold` se queda como está (`SUM(COALESCE(quantity,1))`), porque coincide con las filas de `guestlist_entries` en todos los promotores con ventas reales.
- No hace falta cambiar nada en la interfaz.
