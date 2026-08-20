# Precios y límite de mesas por plan

Se definen los precios reales de los tres planes y se ata cada plan a un tamaño de local (número de mesas configurables).

## Precios

| Plan | Precio | Tamaño |
|---|---|---|
| Básico | Bs. 250/mes | Locales pequeños, hasta 9 mesas |
| Profesional | Bs. 350/mes | Locales medianos, de 10 a 20 mesas |
| Elite | Bs. 500/mes | Locales grandes, más de 20 mesas |

## Cambios en la config de tiers

En `src/lib/subscriptionTiers.ts`:
- `price_bob`: 250 / 350 / 500 (se elimina el TODO de precios).
- Nuevo campo `maxTables` por tier: `9`, `20`, `null` (ilimitado).
- Nuevo bullet y línea de tamaño en cada tarjeta: "Hasta 9 mesas", "De 10 a 20 mesas", "Más de 20 mesas".
- Helper `maxTablesForTier(tier)` y texto de upgrade cuando se llega al límite.
- `formatTierPrice` deja de mostrar "Gratis"/"Precio por definir" para Básico y muestra "Bs. 250/mes".

En `src/hooks/useSubscriptionTier.ts`: exponer `maxTables` (null = sin límite, también para negocios que no son de comida).

## Límite de mesas en la configuración de reservas

En `src/components/reservations/TablesEditor.tsx`:
- Mostrar el conteo actual contra el límite: "8 / 9 mesas de tu plan".
- El bloque de "Agregar" recorta la cantidad al espacio restante; si ya no queda espacio, el botón queda deshabilitado y se muestra el aviso "Tu plan Básico permite hasta 9 mesas. Pasá a Profesional para agregar más", con toque que abre el `PlansSheet`.
- No se borran ni desactivan mesas existentes si un local queda por encima del límite (por ejemplo tras una baja de plan): solo se impide agregar más.

Sin cambios de base de datos ni de facturación en este pass; la activación sigue siendo manual.
