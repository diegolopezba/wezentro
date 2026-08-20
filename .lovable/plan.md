# Actualizar la diapositiva de precios en BusinessIntroSheet

## Resumen
Actualizar la tercera y última diapositiva del bottom sheet de onboarding de cuentas Business ("Cuánto cuesta") para reflejar el modelo de comisión por entradas y ampliar el listado de negocios a los que aplica.

## Cambio esperado

En `src/components/business/BusinessIntroSheet.tsx`, modificar el tercer `STEP`:

- Cambiar el item de **Eventos y entradas** de "gratis" a **5% de comisión por ticket vendido**.
- Ampliar la descripción para que cubra: eventos, discotecas/nightclubs, venues, productores y **experiencias** que requieran un pago para reservar (por ejemplo, scuba diving con horario/slot).
- Mantener el item de restaurantes/cafés/bares con el precio mensual actual y sin comisión por reserva.
- Ajustar el subtítulo si hace falta para que refleje que hay dos modelos: comisión por ticket vs. suscripción mensual.

## Detalle técnico

- Solo se toca el array local `STEPS` del componente; no requiere cambios en la base de datos, hooks ni en `src/lib/subscriptionTiers.ts`.
- El texto debe quedar claro en español para usuarios de Bolivia.
- No modificar iconografía ni navegación del bottom sheet.

## Ejemplo de redacción a aplicar

- **Label:** Eventos y entradas: 5% por ticket
- **Desc:** Eventos, discotecas, venues, productores y experiencias con pago por entrada o slot. Sin mensualidad: solo pagás cuando vendés.
- Restaurante/café/bar: dejar como está (Bs. 250/mes, sin comisión por reserva).
