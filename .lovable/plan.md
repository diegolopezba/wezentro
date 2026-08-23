# Ocultar "Experiencia" en Crear hasta activarla en ajustes

Hoy la tarjeta "Reservar una experiencia" en la página Crear aparece para cualquier cuenta business, mientras que Menú y Reservas dependen de un interruptor en sus páginas de ajustes. Experiencias no tiene ese interruptor.

## Qué se construye

1. **Interruptor de Experiencias** en Ajustes > Business > Experiencias, con el mismo diseño y comportamiento que el de Menú y Reservas (activar/desactivar, toast de confirmación).
2. **La página Crear** solo muestra la sección de experiencias si la cuenta es business y tiene Experiencias activado.
3. **Ajustes Business** muestra en la fila "Experiencias" el estado actual ("Activas" / "Desactivadas"), igual que Menú y Reservas.

## Detalles técnicos

- Migración: añadir `experiences_enabled boolean default false` a `public.profiles` (por defecto apagado, para que sea una función opt-in como pide el pedido).
- `AuthContext` profile type: añadir `experiences_enabled`.
- `BusinessExperiences.tsx`: `Switch` en el encabezado/primera tarjeta que actualiza `profiles.experiences_enabled` y llama `refreshProfile()`.
- `Create.tsx`: la condición `isBusiness &&` de la tarjeta de experiencias pasa a `isBusiness && experiencesEnabled`; si hay un `experienceId` precargado por navegación se limpia cuando está desactivado.
- `BusinessSettings.tsx`: sublabel dinámico de la fila Experiencias.
