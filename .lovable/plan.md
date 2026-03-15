
## Menu Button on Posts Feature

### What we're building

Business accounts that have a menu can optionally display a **"Menu" button** on their individual post/event detail pages. When viewers tap it, the same menu bottom sheet that appears on the business's profile opens up.

### How it works

```
Create post (business with menu)         Event Detail Page (viewer side)
+--------------------------------+       +----------------------------------+
| [Toggle] Show menu button  ●  |  -->  | ♥ 12  ↺  ➤  🔖  |  🍽️ Menú   |
+--------------------------------+       +----------------------------------+
                                                             ↓ tap
                                          +--[ Menu Bottom Sheet ]----------+
                                          | 🍕 Pizzas     Bs. 45.00        |
                                          | 🥤 Bebidas    Bs. 15.00        |
                                          +--------------------------------+
```

### Changes needed

**1. Database migration**
- Add `show_menu_button boolean DEFAULT false` column to the `events` table.

**2. `src/pages/Create.tsx`**
- After the existing guestlist toggle card, add a new card that's only visible when:
  - The creator is a business (`isBusiness = true`)
  - The creator has a menu (check using `useMyMenu()` — only show if `menu?.items.length > 0`)
- Toggle stored in `formData.showMenuButton`
- Passed to the event insert payload

**3. `src/hooks/useEventMutations.ts`**
- Add `show_menu_button?: boolean` to `UpdateEventData` interface so the edit sheet can persist it.

**4. `src/components/events/EditEventSheet.tsx`**
- Add `show_menu_button` to the event prop interface and `formData`
- Add the same toggle UI card (conditionally shown for business owners with a menu)
- Include in the `handleSave` payload

**5. `src/components/events/EventDetailOverlay.tsx` + `src/pages/EventDetail.tsx`**
- Both files share near-identical action button rows. In the **right side** (`{/* Right: Edit dropdown */}` section), add a "Menú" button **before** the `MoreVertical` dropdown:
  - Condition: `event.show_menu_button === true`
  - Uses `UtensilsCrossed` icon + "Menú" label
  - On click: opens the `MenuSheet` with `userId={event.creator_id}`
- Import and render `MenuSheet` at the bottom of both components

### Files to change

| File | Change |
|------|--------|
| New migration | Add `show_menu_button` column to `events` |
| `src/pages/Create.tsx` | Add menu toggle for business users |
| `src/hooks/useEventMutations.ts` | Add field to update interface |
| `src/components/events/EditEventSheet.tsx` | Add menu toggle + wire to save |
| `src/components/events/EventDetailOverlay.tsx` | Add menu button + MenuSheet |
| `src/pages/EventDetail.tsx` | Add menu button + MenuSheet |

### Key UX decisions

- The toggle in Create/Edit only appears if `isBusiness && menu has items` — no empty menus
- On the detail page, the button shows for **all viewers** (not just logged-in users), matching the profile page behavior
- The menu button sits on the **right side** of the action row, to the left of the `MoreVertical` dots menu, keeping the left side for social actions (like/repost/share/save)
- Uses the existing `MenuSheet` component unchanged — zero duplication
