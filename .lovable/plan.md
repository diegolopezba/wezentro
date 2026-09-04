# Los pagos del negocio llegan a la cuenta de Zentro

## Lo que se verificó en el sistema

- El cobro sí envía la instrucción de pago al beneficiario: cada compra manda
  el 94% al código de beneficiario del organizador y deja el 6% en la cuenta
  comercial de Zentro. Eso funciona como se diseñó.
- Los registros de las compras de prueba muestran el beneficiario `4ZMU5`
  (el de tu cuenta diegolopez), con montos correctos (por ejemplo Bs. 10 →
  Bs. 9.40 al negocio, Bs. 0.60 a Zentro).
- El dato clave: el beneficiario del negocio está registrado con **el mismo
  número de carnet (6244221)** que la cuenta de Zentro (Banco Mercantil,
  final 6017) que se registró como beneficiario de plataforma.

## Causa probable (aún por confirmar)

Qhantuy identifica a los beneficiarios por carnet: no permite dos
beneficiarios con la misma cédula. La rutina que registró la cuenta de Zentro
busca por carnet y, si encuentra uno existente con datos bancarios distintos,
**lo edita** para dejar los datos de Zentro. Con la misma cédula 6244221, es
muy probable que haya sobrescrito el beneficiario `4ZMU5` (Banco de Crédito,
final 5374) y hoy ese código apunte al Banco Mercantil final 6017. Por eso el
94% y el 6% terminan en la misma cuenta.

Esto todavía no está confirmado contra Qhantuy: lo primero del plan es
comprobarlo.

## Plan

1. **Confirmar el destino real de `4ZMU5`**
   Consultar la lista de beneficiarios en Qhantuy y ver a qué banco y número
   de cuenta apunta hoy ese código. Si apunta al final 6017, la causa queda
   confirmada.

2. **Separar las identidades**
   La cuenta de Zentro y la cuenta de prueba del negocio no pueden compartir
   la misma cédula en Qhantuy. Hay dos caminos y necesito que elijas:
   - (a) Registrar el beneficiario de Zentro con la cédula de otra persona o
     con los datos de la empresa (lo ideal para producción), y devolver
     `4ZMU5` a los datos del negocio (Banco de Crédito, final 5374).
   - (b) Usar para las pruebas del negocio una cuenta con otra cédula real
     (por ejemplo otra persona de confianza), dejando 6244221 solo para
     Zentro.

3. **Eliminar la rutina que sobrescribe beneficiarios**
   La función temporal de registro de la cuenta de Zentro sigue publicada y
   sin autenticación, y edita cualquier beneficiario que comparta la cédula.
   Se borra del proyecto para que no vuelva a pisar datos de un negocio.

4. **Blindar el registro de beneficiarios de negocios**
   Al registrar/editar un beneficiario desde la app, si Qhantuy responde que
   la cédula ya existe, hoy se "adopta" ese código existente. Se cambia por un
   mensaje claro al negocio ("ese carnet ya está registrado con otra cuenta
   bancaria; contáctanos") en lugar de heredar una cuenta ajena. Además, nunca
   se editará el beneficiario de plataforma de Zentro desde ese flujo.

5. **Prueba real antes de salir a producción**
   Una compra de monto bajo de entrada, una de lounge y una de experiencia;
   verificar en Qhantuy que el 94% aparece con destino Banco de Crédito final
   5374 y el 6% queda en la cuenta de Zentro.

## Detalles técnicos

- Archivos involucrados: `supabase/functions/qhantuy-platform-setup/index.ts`
  (se elimina), `supabase/functions/qhantuy-register-beneficiary/index.ts` y
  `qhantuy-edit-beneficiary/index.ts` (manejo de cédula duplicada),
  `supabase/functions/_shared/qhantuy.ts` (helper `isDuplicateCiError` /
  protección del código de plataforma).
- No cambia el reparto ni el esquema de base de datos: `payment_sessions` ya
  guarda bruto, comisión y neto correctamente.
- `supabase/config.toml`: se quita la entrada de la función eliminada.
