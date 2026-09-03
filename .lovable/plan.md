# Arreglar el guardado de planos con elementos decorativos

## Qué está pasando

Los elementos de referencia nuevos (Escenario, Barra, DJ, Pista, Baños, Entrada) se crean con capacidad 0, porque no se venden ni cuentan en la capacidad del lugar.

La base de datos todavía exige que toda área tenga capacidad mayor a 0:

- `venue_layout_areas`: `CHECK (capacity > 0)`
- `event_areas`: `CHECK (capacity > 0)`

Por eso al guardar el plano aparece el error `venue_layout_areas_capacity_check`. El mismo error aparecería al guardar un evento con elementos decorativos.

## Solución

Permitir capacidad 0 únicamente en elementos decorativos, manteniendo la regla estricta para áreas vendibles.

Cambio en ambas tablas: reemplazar la restricción por

```text
capacity > 0 OR is_decor = true
```

Así una mesa o lounge sigue obligada a tener al menos 1 persona, y los elementos de referencia pueden guardarse con 0.

## Detalles técnicos

- Migración aditiva que hace `DROP CONSTRAINT` + `ADD CONSTRAINT` de `venue_layout_areas_capacity_check` y `event_areas_capacity_check` con la nueva condición. No se borran ni renombran columnas ni datos.
- No se requieren cambios de código: `useVenueLayouts.ts` ya envía `is_decor` y `capacity: 0` en ambos inserts (plantilla y áreas de evento).
- Verificación posterior: guardar un plano con un elemento decorativo y un área vendible, y confirmar que un área vendible con capacidad 0 sigue siendo rechazada.
