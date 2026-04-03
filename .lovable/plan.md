

## Interactive Business Hours Editor

### Problem
The current business hours input is a plain textarea where owners type free-text. This makes data inconsistent and the display on visitor profiles is unstructured.

### Solution
Replace the textarea with a **structured day-by-day schedule editor** where each day of the week has toggle (open/closed) and time pickers for opening and closing hours. Data is stored as JSON in the existing `business_hours` text column and rendered nicely on the visitor-facing `BusinessInfoSheet`.

### UI Design — Editor (BusinessInfo.tsx)

```text
┌─────────────────────────────────┐
│ 📅 Horarios de atención         │
│                                 │
│ Lunes        ○ Cerrado          │
│              ● Abierto          │
│              [09:00] - [18:00]  │
│                                 │
│ Martes       ● Abierto          │
│              [09:00] - [18:00]  │
│ ...                             │
│ Domingo      ● Cerrado          │
│                                 │
│ [  Guardar información  ]       │
└─────────────────────────────────┘
```

Each day: a Switch toggle + two time Selects (hour:minute in 30-min increments). Closed days are greyed out.

### UI Design — Visitor Display (BusinessInfoSheet)

```text
┌──────────────────────────┐
│ 🕐 Horarios              │
│                          │
│ Lun   09:00 – 18:00     │
│ Mar   09:00 – 18:00     │
│ Mié   Cerrado           │
│ ...                      │
│                          │
│ ● Abierto ahora (green) │
│   or                     │
│ ● Cerrado ahora (red)   │
└──────────────────────────┘
```

Show an "Abierto ahora" / "Cerrado ahora" badge based on current local time.

### Data Format
JSON string stored in `business_hours` column (no schema change needed):

```json
[
  { "day": 0, "open": true, "from": "09:00", "to": "18:00" },
  { "day": 1, "open": true, "from": "09:00", "to": "18:00" },
  { "day": 6, "open": false, "from": "", "to": "" }
]
```

Backward compatibility: if the stored value isn't valid JSON, fall back to displaying it as plain text (for existing free-text entries).

### Files to Change

| File | Change |
|---|---|
| `src/components/profile/BusinessHoursEditor.tsx` | **New** — day-by-day schedule component with Switch toggles and time selects |
| `src/pages/BusinessInfo.tsx` | Replace the `<Textarea>` for hours with `<BusinessHoursEditor>`, serialize/deserialize JSON |
| `src/components/profile/BusinessInfoSheet.tsx` | Parse JSON hours into a structured table with day rows + "Abierto/Cerrado ahora" badge. Fall back to plain text for legacy data |

No database migration needed — reuses existing `business_hours` text column.

