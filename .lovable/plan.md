
## Goal
Replace (or augment) the raw budget inputs in the "Nueva Promoción" dialog with a reach-based estimator — the advertiser sets a **target audience size** (e.g. "I want to reach 10,000 people") and Zentro calculates the cost automatically at $5 CPM. Exactly how Instagram/Meta Ads works.

---

## How it works mathematically

```
CPM = $5 (cost per 1,000 impressions)
Target Reach = 10,000 users
Estimated Cost = (10,000 / 1,000) × $5 = $50
```

The user picks a reach goal → we display the estimated cost → they confirm → that becomes their `total_budget`.

---

## What changes

### 1. `PromocionesSection.tsx` — Create dialog UI
Replace the two raw budget inputs with a mode toggle:

```
[ Presupuesto ]  [ Alcance estimado ]   ← toggle tabs
```

**Alcance mode:**
- Slider or input: "¿A cuántas personas quieres llegar?" (e.g. 1,000 → 500,000)
- Live calculation display:
  ```
  Alcance estimado: 10,000 personas
  Costo total estimado: $50.00 (a $5 CPM)
  Impresiones necesarias: ~10,000
  ```
- On submit, `total_budget` = `(reach / 1000) * 5`

**Presupuesto mode (existing):**
- Shows budget inputs as before
- Adds a reverse estimate: "Con $50, llegarás a ~10,000 personas"

### 2. No backend changes needed
The `sponsored_posts` table already has `total_budget` and `impressions` — we just populate `total_budget` from the reach calculation. No schema changes required.

### 3. Visual design
- Mode toggle at the top of the budget section
- Reach slider: 1K → 500K with presets (1K / 5K / 10K / 50K / 100K)
- Highlighted summary card showing estimated reach and cost before confirming
- Small disclaimer: "El alcance real puede variar según la segmentación y disponibilidad del inventario"

---

## Files to modify
- `src/components/dashboard/PromocionesSection.tsx` — add toggle + reach estimator UI + reverse budget estimate

That's the only file. No DB migrations, no new hooks needed.
