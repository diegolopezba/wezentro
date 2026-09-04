# Actualización de Términos de Uso y Política de Privacidad

Both legal pages are outdated. They still describe features that no longer exist (direct messaging, Stripe subscriptions, active referral rewards) and omit major features added since (lounges/áreas, experiencias, invitaciones especiales, planes Business, cuentas business separadas, contacto por teléfono). This is a content-only rewrite of two files: `src/pages/TermsOfUse.tsx` and `src/pages/PrivacyPolicy.tsx`. No code, database, or routing changes.

## Términos de Uso — cambios

1. **Fecha de actualización** → "4 de septiembre de 2026".
2. **Sección 2 (Descripción del Servicio)** — actualizar la lista de funciones:
   - Descubrimiento de eventos, publicaciones y experiencias
   - Compra de entradas por categorías (tiers) y lounges/áreas con plano visual del local
   - Reservas de mesa y reservas de experiencias
   - Invitaciones especiales gratuitas por enlace
   - Contacto con negocios por teléfono (ya no mensajería dentro de la app)
   - Cuentas Business con planes Básico, Profesional y Elite/Premium
   - Publicaciones impulsadas (sponsored posts)
3. **Sección 6 (Eventos y Pagos)** — ampliar:
   - Lounges/áreas: el organizador define capacidad, precio, entradas incluidas, descripción, beneficios e instrucciones de llegada; puede hacer preguntas al comprador cuyas respuestas quedan registradas
   - Experiencias como tipo de publicación independiente con reservas
   - Comisión de plataforma: Zentro retiene el 6% de las ventas de entradas/lounges/experiencias; el 94% se distribuye al beneficiario del negocio vía Qhantuy; Qhantuy cobra al comprador un 1% adicional como cargo de procesamiento (pre-cargo)
   - Pago con tarjeta disponible mediante pasarela externa (Cybersource) además del QR
4. **Sección 7 (Mensajería)** — reemplazar por "Contacto": la mensajería directa está deshabilitada; los usuarios contactan a negocios mediante el número de teléfono que el negocio publica voluntariamente en su perfil. Eliminar las opciones de privacidad de mensajería (ya no existen).
5. **Sección 8 (Suscripciones)** — reescribir:
   - Planes Business: Básico, Profesional, Elite/Premium, con facturación mensual o anual (5% de descuento anual)
   - Pagos procesados por Qhantuy (QR) o Cybersource (tarjeta) — **eliminar toda referencia a Stripe**
   - Renovación manual (no hay cobro automático recurrente); período de gracia tras expiración; el acceso a funciones premium requiere plan activo
   - Cancelación/gestión desde el panel admin de Zentro
6. **Sección 10 (Programa de Referidos)** — aclarar que el programa está actualmente inactivo (solo infraestructura de seguimiento, sin recompensas activas).
7. **Nueva sección: Invitaciones especiales** — enlaces de entrada gratuita creados por el organizador, con etiqueta "INVITADO ESPECIAL"; el organizador es responsable de su distribución.
8. **Sección 3 (Cuenta)** — añadir: cuentas Business son cuentas separadas con inicio de sesión propio; los datos de beneficiario bancario son obligatorios para vender entradas.

## Política de Privacidad — cambios

1. **Fecha de actualización** → "4 de septiembre de 2026".
2. **Sección 2 (Información recopilada)** — añadir:
   - Teléfono de contacto del negocio (visible públicamente si el negocio lo publica)
   - Datos de beneficiario bancario de cuentas business (para distribución de pagos Qhantuy)
   - Respuestas a preguntas del organizador al comprar lounges/áreas
   - Selección de lounge/área y plano del local al comprar
   - Tipo de plan de suscripción y fechas de vigencia
3. **Sección 4 (Información Pública)** — actualizar: el teléfono de contacto del negocio es público si se publica; eliminar referencia a configuración de mensajería (ya no existe).
4. **Sección 6 (Servicios de Terceros)** — reemplazar Stripe por **Cybersource** (pagos con tarjeta — los datos de tarjeta nunca pasan por nuestros servidores); mantener Qhantuy con descripción actualizada del flujo 94%/6%/1%.
5. **Sección 8 (Notificaciones)** — quitar "nuevos mensajes y solicitudes de chat"; la app ya no tiene mensajería.
6. **Sección 9 (Seguridad)** — actualizar: datos de tarjeta gestionados por Cybersource (no Stripe); quitar referencias a privacidad de mensajería.
7. **Sección 9b (Datos de Pagos)** — añadir: registro de lounge/área adquirida, respuestas del comprador a preguntas del organizador, y registro del cargo de procesamiento de Qhantuy (1%).

## Sin cambios

- Contacto `hello@zentro.com`, edad mínima 18+, eliminación de cuenta, estructura visual de las páginas (header, ScrollArea, secciones numeradas).

## Verificación

- `npx tsgo --noEmit` y `bun run build` deben pasar.
- Revisión visual de ambas páginas en el preview.
