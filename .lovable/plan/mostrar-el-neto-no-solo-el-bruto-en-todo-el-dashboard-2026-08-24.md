# Mostrar el neto (no solo el bruto) en todo el dashboard

Hoy el dashboard muestra el bruto casi en todos lados; el desglose de comisión solo aparece en una tarjeta del Resumen. La idea es que el número grande que ve el negocio sea **lo que realmente va a recibir**, con el bruto siempre visible como dato secundario.

## Cómo queda

Regla única en toda la app:

```text
Bruto           Bs. 100   (lo que paga el usuario)
Comisión total  Bs.   6   (6%)
Neto estimado   Bs.  94   (lo que recibe el organizador)
```

Cambios visibles:

1. **Ventas y promotores → Resumen** (`SalesSummary`): la tarjeta principal pasa a mostrar **"Neto estimado"** como número grande, con "Bruto Bs. X · Comisión total (6%) −Bs. Y" debajo. Las mini-tarjetas (Ticket prom., Por evento) muestran el neto con el bruto en letra pequeña.
2. **Gráfico "Ingresos en el tiempo"**: se grafica el neto; el tooltip muestra bruto y neto.
3. **Origen de los ingresos** (donut promotores/orgánico): se mantiene en bruto porque es atribución, y se etiqueta explícitamente como "montos brutos".
4. **Ventas → Por evento** (`SalesEvents`): cada tarjeta muestra neto como monto principal y el bruto debajo.
5. **Dashboard → Resumen** (`OverviewTab`): la tarjeta "Bruto" se acompaña de una tarjeta "Neto"; se actualiza el desglose actual a "Comisión total (6%)".
6. **Explicación**: un botón de info junto al neto abre una hoja corta que explica que el 6% es la comisión total y que el resto es lo que recibe el organizador — reutiliza el patrón de hojas informativas existente.

## Detalles técnicos

- Nuevo helper compartido `src/lib/platformFee.ts`: `PLATFORM_FEE_BPS = 600`, `feeOf(gross)`, `netOf(gross)` con redondeo a 2 decimales, espejo de `splitAmount` en `supabase/functions/_shared/qhantuy.ts` para que el cálculo sea coherente. Todo el frontend usa este helper — nada de 0.94 hardcodeado por componente.
- `useSalesOverview` ya devuelve `platformFee` y `netPayout` desde `payment_sessions`; se actualiza a usar la base de 6% y el split guardado.
- `SalesSummary` / `SalesEvents` se alimentan de los RPC `get_creator_sales_by_event` y `get_creator_sales_monthly`, que devuelven solo bruto. En esta pasada el neto se **deriva en el cliente** con `netOf()` (equivalente al split guardado, ya que el porcentaje es fijo). No se tocan los RPC.
- Copys en español, formato `Bs.` vía `formatBs`; el neto siempre etiquetado como "estimado".
- Sin cambios en las edge functions ni en el reparto real de dinero: esto es solo presentación.

## Verificación

- Typecheck del proyecto.
- Revisión visual del dashboard y de Ventas y promotores con datos actuales, confirmando que neto = bruto − 6% en cada tarjeta.

