
## Review of Both Legal Documents

After reading both files in full, here is what I found that should be fixed:

### Terms of Use — 4 issues
1. **Date** — shows "16 de marzo de 2026", should be today: "24 de marzo de 2026"
2. **Duplicate section numbers** — there is a section "6b" and then a separate "7. Mensajería" was inserted, which means the document now has two sections labeled "7" (Mensajería and Suscripciones). The numbering from 7 onwards is off.
3. **Contact email** — shows `zentro@gmail.com` in section 18 (Terminación mentions it too). The Help page uses `hello@zentro.com` — should be consistent.
4. **Reservation system** — the new table reservation feature (time windows, business hours controlling booking slots) is not mentioned. Should be added as a brief clause under section 6 (Events, Guestlists y Pagos).

### Privacy Policy — 2 issues
1. **Date** — also shows "16 de marzo de 2026", should be updated.
2. **Contact email** — shows `zentro@gmail.com` in section 9 (Sus Derechos) and section 15 (Contacto). Should match `hello@zentro.com`.

### What is NOT needed
- No structural rewrites — the documents are comprehensive and well-written
- No new sections required — the reservation system is a small addition to existing clauses
- No store compliance issues — the terms already cover in-app purchases, age requirement (13+), and the terms checkbox at signup

---

### Files to edit

| File | Changes |
|---|---|
| `src/pages/TermsOfUse.tsx` | Update date → "24 de marzo de 2026"; fix section numbering (7 Mensajería → 7, Suscripciones → 8, renumber 8–18 accordingly); add one sentence about the reservation system in section 6; replace `zentro@gmail.com` → `hello@zentro.com` in sections 11 and 18 |
| `src/pages/PrivacyPolicy.tsx` | Update date; replace `zentro@gmail.com` → `hello@zentro.com` in sections 9 and 15 |
