
## The Problem

The current flow is a dense, all-on-one-screen form inside a small dialog. It throws budget mode toggles, sliders, category pills, radius sliders, gender selects, and age inputs all at once. Instagram and TikTok solve this with **guided multi-step flows** — one decision per screen, progressive disclosure, heavy visual feedback, and a sticky cost summary that builds confidence.

Key insights from Meta/TikTok "Boost" patterns:
1. **Step-by-step wizard** — not a form dump. Each step is one question.
2. **Audience first, budget second** — users think "who do I reach" before "how much do I spend"
3. **Live preview panel** — a persistent cost/reach estimator on the side (or bottom) that updates as they configure
4. **Bold, simple numbers** — large typography for reach and cost, not small labels
5. **One primary CTA per step** — "Siguiente →" keeps momentum, final step is "Pagar y Activar"
6. **Empty state is a hero CTA** — not a tiny button. It should sell the value proposition

## The Redesign Plan

### 1. Replace the Dialog with a full-height Sheet (bottom sheet on mobile)
A Sheet gives us more vertical space, feels more native on mobile, and allows a step-by-step flow without feeling cramped.

### 2. 4-Step Wizard Flow

```
Step 1: Elige tu evento
  → Large event cards with cover image, date, already-promoted events greyed out
  → "¿Qué evento quieres impulsar hoy?"

Step 2: ¿A quién quieres llegar?
  → Audience presets: "Público cercano" / "Interesados en [category]" / "Personalizado"
  → Simple toggles, not raw inputs
  → "Automático (recomendado)" is pre-selected = we handle targeting

Step 3: ¿Cuánto quieres invertir?
  → 4 budget preset cards: $10 / $25 / $50 / $100 (most popular badge on $25)
  → Each card shows estimated reach in big bold text
  → Custom option below
  → Live updating sticky footer: "Llegarás a ~5,000 personas por $25"

Step 4: Confirmar y Pagar
  → Summary card: event title, audience, reach estimate, total cost
  → Big green "Pagar $25 y Activar →" button
  → Disclaimer line
```

### 3. Redesigned Empty State (hero style)
Replace the weak empty state with a value-prop card:
- Gradient background
- Stat: "Eventos con boost reciben 3x más asistentes"
- Single large CTA button "Impulsar mi evento →"

### 4. Campaign cards (active/draft) — minor improvement
- Add event cover thumbnail
- Status badge more prominent with color dot
- Draft cards: show "Listo para activar" CTA more visually prominent

## Files to modify
- `src/components/dashboard/PromocionesSection.tsx` — complete redesign (single file, no backend changes)

## Key UX principles applied
- **Reduce cognitive load**: one decision per step
- **Anchor with presets**: $25 as "más popular" removes paralysis
- **Show value before cost**: reach number is bigger than dollar amount
- **Build momentum**: progress indicator + "Siguiente →" keeps flow moving
- **Trust signals**: "El pago es seguro vía Stripe" on the payment step
