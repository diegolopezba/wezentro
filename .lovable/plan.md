# Comisión de Zentro (5%) en cada pago

Configurar el reparto del dinero en cada cobro por la app: el organizador recibe el 95% vía payout automático de Qhantuy, y el 5% restante queda en la cuenta de Zentro. El 1% de Qhantuy lo descuenta Qhantuy por su cuenta, así que no lo modelamos en el reparto (el organizador termina recibiendo ~94% neto).

## Estado actual (verificado)

- El cobro a Qhantuy (`/v2/checkout`) hoy **no envía ningún `custom_payouts`**: no se está instruyendo ningún pago al organizador desde el checkout, solo se guarda su `beneficiary_code` como dato de auditoría.
- `payment_sessions` guarda `amount` y `beneficiary_code`, pero no tiene campos para comisión ni monto neto del organizador.

## Cómo queda

Ejemplo con una entrada de Bs. 100:

```text
Usuario paga            Bs. 100
Payout al organizador   Bs.  95   (custom_payouts al beneficiary_code)
Queda para Zentro       Bs.   5   (5% comisión)
Qhantuy retiene         ~Bs.  1   (lo descuenta Qhantuy)
Organizador recibe neto ~Bs.  94
```

Aplica a **todo** lo que se cobra por la app: entradas de eventos, áreas del plano visual y experiencias.

En el panel de Ventas del negocio se muestra, además del bruto, cuánto es comisión y cuánto es el neto a recibir, para que no haya sorpresas.

## Detalles técnicos

**Configuración central** (`supabase/functions/_shared/qhantuy.ts`):
- `PLATFORM_FEE_BPS = 500` (5%), leído de `QHANTUY_PLATFORM_FEE_BPS` si existe, para poder ajustarlo sin redeploy de lógica.
- Helper `splitAmount(total)` → `{ payoutAmount, platformFee }` con redondeo a 2 decimales: `payoutAmount = round(total * (1 - bps/10000))`, `platformFee = total - payoutAmount` (así nunca se descuadra el total).

**Base de datos** (`payment_sessions`):
- Agregar `platform_fee_bps int not null default 500`, `platform_fee_amount numeric`, `payout_amount numeric`.
- Se llenan al crear la sesión, para tener el histórico exacto aunque el porcentaje cambie después.

**Edge functions**:
- `generate-qhantuy-qr` (entradas y áreas): calcular el split y enviar en el body del checkout `custom_payouts: [{ code: beneficiary_code, amount: payoutAmount }]`; guardar los tres campos nuevos en la sesión.
- `generate-experience-qr`: mismo cambio.
- Ambas: si el payout calculado queda en 0 o negativo (montos mínimos), rechazar con un mensaje claro en vez de mandar un payout inválido.

**Frontend**:
- `src/pages/BusinessSales.tsx` / `useSalesOverview.ts`: mostrar "Bruto", "Comisión Zentro (5%)" y "Neto estimado" (aclarando que Qhantuy descuenta ~1% adicional).
- `BusinessIntroSheet` ya menciona el 5%; se deja igual.

**Verificación**:
- Typecheck y despliegue de las dos funciones.
- Prueba real de bajo monto: confirmar en el dashboard de Qhantuy que el payout llega al beneficiario por el 95% y que el resto queda en la cuenta de Zentro. Hasta hacer esa prueba, el reparto queda marcado como no verificado en producción.
