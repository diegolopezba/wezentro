# Bloquear experiencias sin datos de cobro

## Problema

Al crear una publicación se puede vincular una experiencia aunque el negocio no tenga datos bancarios cargados. La publicación queda activa y el error recién aparece cuando alguien intenta pagar (la función de QR responde "El organizador aún no configuró sus pagos").

En Crear ya existe esta protección para entradas con precio: si falta el beneficiario, se abre `BeneficiaryRequiredSheet` ("Configura tus datos de cobro" → Configurar cobros). La rama de experiencias está explícitamente excluida de esa validación.

## Qué se va a cambiar

1. **Crear publicación**: si el negocio no tiene datos de cobro y elige una experiencia (o intenta publicar con una vinculada), se abre el mismo prompt de "Configura tus datos de cobro", adaptado a experiencias. No se publica hasta configurarlo.
2. **Selector de experiencias**: cuando faltan los datos, los chips de experiencia muestran el aviso al tocarlos en vez de seleccionarse, con una línea de texto explicando que hacen falta los datos de cobro para vender reservas.
3. **Editar publicación**: misma regla al vincular/mantener una experiencia desde la hoja de edición del evento.
4. **Lado del invitado**: si una experiencia ya publicada no tiene cobros configurados, la hoja de reserva muestra un mensaje claro ("El organizador todavía no habilitó los pagos, intentá más tarde") en vez del error crudo al generar el QR.

## Detalle técnico

- `src/components/events/BeneficiaryRequiredSheet.tsx`: agregar prop opcional `context: "tickets" | "experience"` para variar el copy (mismo diseño, mismo botón a `/settings/business/payments`).
- `src/pages/Create.tsx`: quitar la exclusión `!experienceId` en la validación de cobro; en `handleSubmit`, si `experienceId && !hasBeneficiary` → `setShowBeneficiaryGate(true)` y cortar. En los chips del selector, si `!hasBeneficiary`, `onClick` abre la hoja en vez de setear `experienceId`.
- `src/components/events/EditEventSheet.tsx`: misma verificación al guardar cuando hay experiencia vinculada.
- `src/components/experiences/ExperienceBookingSheet.tsx`: mapear el código `no_beneficiary` que ya devuelve `generate-experience-qr` a un estado de error amable dentro de la hoja.

Sin cambios de base de datos ni de funciones del backend.
