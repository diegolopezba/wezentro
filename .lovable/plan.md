## Cambio visual en botones del perfil business

En `src/pages/Profile.tsx`, actualizar los estilos de los dos botones "Editar Menú" y "Reservas" que aparecen cuando `isBusiness && isFoodBusiness` es true.

### Cambios

1. **Eliminar** las clases de fondo degradado naranja (`bg-gradient-to-br from-orange-500/10 to-red-500/10`) para dejar fondo transparente.
2. **Cambiar** el borde de `border-orange-500/30` a `border-primary/30` (rojo brand).
3. **Cambiar** el color del icono de `text-orange-500` a `text-primary` (rojo brand).

Se aplica a ambos botones: "Editar Menú" (icono `UtensilsCrossed`) y "Reservas" (icono `CalendarCheck`).

No se modifica ninguna otra lógica.