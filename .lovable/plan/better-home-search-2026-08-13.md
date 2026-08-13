# Better home search

## What it searches today

In the home feed, search only looks at two fields when no filters are active: event **title** and **location name** (exact substring, case sensitive to accents). If a category pill or filter is on, it goes through the shared filter hook, which also checks **category** and **description**. Nothing else — no organizer name, no accent tolerance, no multi-word handling, no people results, and results are never ranked by relevance (they keep feed order).

So "cafe" doesn't find "Café", "fiesta rooftop" finds nothing unless those exact words appear together in that order, and searching a venue/business by name returns nothing.

## What to build

**1. Accent- and case-insensitive matching**
Normalize both the query and the searched text (strip diacritics, lowercase, collapse spaces) so "cafe" = "Café", "reggaeton" = "reggaetón".

**2. Multi-token AND search**
Split the query into words; an event matches when every word matches somewhere in its searchable text. "fiesta rooftop viernes" works.

**3. Wider searchable fields**
Match against title, location name, address/city, category label (Spanish name, not just the internal id — "fiesta" should match `party`), description, organizer/creator name and username, and derived semantic tags.

**4. Semantic tags (already in the codebase)**
Reuse the existing keyword tag dictionary (`descriptionTagExtractor`) so a query like "electronica", "gratis", "terraza" or "karaoke" matches events whose text implies that vibe even without the exact word.

**5. Relevance ranking instead of feed order**
Score each match and sort by score: exact title match > title prefix > title word > organizer/venue name > category/tag > description. Break ties by soonest start date. Distance gives a small boost when location is known.

**6. Light typo tolerance**
For queries of 4+ characters with no results, retry with a small edit-distance allowance (1 typo) on title and organizer words, so "restarante" still finds "Restaurante".

**7. People in home search**
Home currently returns only events. Add a compact "Personas" strip above the event results (reusing the existing user search hook and result card from Discover) so typing a friend's or venue's name surfaces the profile too.

**8. Search UX polish**
- Debounce input (~200ms) so scoring doesn't run on every keystroke.
- Empty state: "Sin resultados para X" with a suggestion to clear filters.
- Keep the existing behavior where distance filtering is skipped while searching.

## Technical notes

- New `src/lib/searchScoring.ts`: `normalizeText`, `tokenize`, `buildSearchIndex(event)` (memoized per event id), `scoreEvent(event, tokens)`, and a `levenshteinWithin(a, b, 1)` helper.
- `useNearbyEvents` search block replaced with the scored matcher; when a query is present the result is sorted by score before the existing sort logic runs.
- `Index.tsx`: the non-filtering path uses the same scorer instead of its inline title/location check, so search behaves identically with or without active filters. Adds a debounced query value and renders the people strip when the query is 2+ chars.
- Category labels come from the existing `src/lib/categories.ts` taxonomy; no new category data.
- No database or edge function changes — all of this is client-side over the events already loaded.

## Not included

- Server-side full-text search (Postgres `tsvector`) or Algolia. Worth doing later if the catalog outgrows the client-side cap, but unnecessary at the current 200-item feed window.
- Search history / recent searches.
