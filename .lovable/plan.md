
## Plan: Real Logo Images for Mock Business Accounts

### What the user wants
Instead of placeholder/initials avatars (like ui-avatars.com), the 100 business accounts should display real-looking logo images — actual brand logos sourced from the web.

### Approach: Use Clearbit Logo API + Logo.dev

The best free, no-auth-required service for real brand logos is **Logo.dev** (`https://img.logo.dev/{domain}?token=pk_...`) or the simpler **Clearbit Logo API** (`https://logo.clearbit.com/{domain}`). Clearbit is completely free, returns real company logos as PNG, and works for most known brands. For local Bolivian restaurants that aren't on Clearbit, we fall back to a curated set of food/restaurant stock images from **Unsplash** (free, no auth).

### Strategy per business type

Since these are local Bolivian businesses (not international chains), Clearbit won't have most of them. Instead, the plan is:

1. **Use curated Unsplash food/restaurant images** — Unsplash provides stable public image URLs that don't expire. We'll assign each business a specific, relevant Unsplash image URL based on their type:
   - Cafés → coffee/café aesthetic images
   - Burger places → burger food photos
   - Brunch spots → brunch table photos
   - Bars/nightlife → bar/cocktail photos
   - Restaurants (fine dining) → upscale restaurant photos
   - Sushi/Japanese → sushi/Japanese food photos
   - Pizza → pizza photos
   - Healthy food → salad/healthy food photos
   - Rooftop bars → rooftop bar photos

2. **For the 50 normal users** → Use `https://i.pravatar.cc/150?img={n}` which provides 70 consistent real human face photos indexed by number. This is free and stable.

### Implementation

This is purely a **data migration / seed SQL operation** — no code changes needed. We'll create a Supabase edge function `seed-mock-data` that:

1. Creates auth users via `supabase.auth.admin.createUser()` for all 150 accounts with pre-set passwords
2. Inserts profile rows with:
   - `is_business = true` for the 100 businesses
   - Correct `business_type` (cafe, restaurant, bar, etc.)
   - `is_food_business = true` for food-related businesses
   - Real curated Unsplash image URLs as `avatar_url`
   - Santa Cruz de la Sierra as `city`
   - Bolivian usernames for the 50 normal users
3. Creates 2-3 events per business
4. Creates menu entries for food businesses (5-8 items per menu)

### Business classification from the list (98 businesses total)

**Cafés / Coffee Shops** (~30):
Cafe 4 Llamas, Pekelicious Cafe, Patio Colonial Cafe, Kardinia Brunch and Coffee, Sitcom Cafe, Buen Dia, Cafe Jardin, Varea Coffees, Astemisa Coffee Bar, Cafe Buena Vista, Cofi, Typica, Casa Cero, Pineapple Tea, Alquimia Specialty Coffee, Alto Tostado Coffee Roast, Lumina Cafe, Veinticuatro Coffee, Tostado Cafe, Ame Cafe & Bar, Cornerstone Cafe Bistro, L'arome, Rue 170 Cafe Bistro, Gout Bakery, Sir Francis, Bruko, Emilia, Dinona, Irish Pub, Autoria Signature

**Brunch & Bar** (~10):
Bonita Brunch & Bar, Mediterraneo Brunch y Tapas, Sir Pieper Resto Bar, Beer Station, Botanica, Kaos, Dossier Bistro, Gallon Negro, Aviator

**Restaurants** (~20):
La Recoleta, Fogon del Gringo, La Gaira, Elsa Restaurante, Sonnngarten Restaurante, As de Copas, Tagliatella, Republica, El Cuartito, La Tranquera, Fogo de Chao, La Cabrera, Vaca Morena, Tinto Carnes & Vinos, Muelle 18, Ottimo, Casacuina, De Castilla, El Gallo Frances, Brunello Trattoria

**Sushi / Asian** (~5):
Shimaya, New Tokyo, Naoki Sushi, Hatorri, Zenzoo Center

**Pizza** (~3):
Pizzeria Firenze, Vulcanica Pizzeria, Santo Peccato

**Burgers** (~3):
El Beber Burger, Hito, Punto

**Bar / Nightlife** (~5):
La Happy Hour, Noi, Lorca, Callejxn, Rokani

**Healthy** (~4):
Healthy by Jackie, Keto Vicio, Nativo Healthy Food, The Fussion

**Rooftop / Upscale** (~5):
SBC Rooftop, Biancaflor, Noa, Bernadette, Mangarosa, Habito Kitchen

**Other** (~5):
Steel Container Grill & Bar, Pinata Wey, Los Hierros, Cornelia, El Arriero, Distinto

### Image sources — stable Unsplash photo IDs by category

Each business gets a unique Unsplash URL in the format:
`https://images.unsplash.com/photo-{ID}?w=200&q=80`

We'll assign different photo IDs within each category so no two businesses share the same avatar.

### Files to create/change

- **New**: `supabase/functions/seed-mock-data/index.ts` — Edge function that seeds all 150 accounts
- **New**: `src/pages/SeedData.tsx` — A simple admin-only page with a "Run Seed" button (password protected)
- **Modified**: `src/App.tsx` — Add route `/admin/seed` for the seed page

### How it works
1. User navigates to `/admin/seed` in the app
2. Clicks "Seed 150 Mock Accounts" button  
3. The edge function runs, creates auth users + profiles + events + menus
4. Done — all 150 accounts appear in the app with real-looking logos

### Important notes
- All 150 mock accounts will use the password `Zentro2025!` for easy login
- The edge function needs `service_role` key to create auth users — this is already available as a Supabase secret
- Accounts will have Santa Cruz de la Sierra as their city
- Business hours, phone numbers, and bios will be realistic Bolivian data
- The seed function is idempotent — running it twice won't create duplicates (uses `ON CONFLICT DO NOTHING`)
