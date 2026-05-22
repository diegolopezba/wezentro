## Arreglar visibilidad de "Editar Menú" para food businesses

### Causa
`is_food_business` quedó desincronizado en la cuenta `cortado.scz` (type=`coffee` pero flag=`false`). El botón "Editar Menú" depende de ese flag cacheado en lugar de derivarlo del tipo.

### 1. Data fix (insert)
`UPDATE profiles SET is_food_business = true WHERE business_type IN ('restaurant','coffee','bar') AND is_food_business IS DISTINCT FROM true` — resincroniza esta cuenta y cualquier otra futura con el mismo desfase.

### 2. Helper único
Nuevo `src/lib/businessTypes.ts`:
```ts
export const FOOD_BUSINESS_TYPES = ["restaurant", "coffee", "bar"] as const;
export const isFoodBusinessType = (t?: string | null) =>
  !!t && (FOOD_BUSINESS_TYPES as readonly string[]).includes(t);
```

### 3. Derivar UI desde `business_type`
- `src/pages/Profile.tsx` → `const isFoodBusiness = isFoodBusinessType(profile?.business_type)`
- `src/pages/UserProfile.tsx` → mismo cambio (línea 73)
- `src/components/events/AttachedBusinessCtas.tsx` → usa el helper en vez de `biz.is_food_business`
- `src/pages/BusinessInfo.tsx` → consume el helper para calcular `isFood` (sigue escribiendo `is_food_business` en DB para que `useFoodLocations` no se rompa)

### No cambia
- Schema, RLS.
- `useFoodLocations` (sigue filtrando por `business_type` en DB).
- `menu_enabled` / `reservations_enabled` siguen sin gate-ear los botones de edición en el perfil propio.
