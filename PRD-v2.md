# What Should I Order? — PRD v2
## Demo Build (for Swiggy Builders Club Application)

> **Goal of this build**: A working demo website that proves the concept end-to-end — 
> calorie/macro input → nearby restaurant discovery → dish-level macro matching → 
> order handoff. Built without Swiggy MCP (pending access), using Google Places API + 
> OpenAI + food DB. Demo will be submitted as proof-of-concept with Swiggy Builders Club application.
> Once approved, v3 replaces the Google Places layer with Swiggy MCP tools natively.

---

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Restaurant Discovery**: Google Places API (New) — Nearby Search + Place Details
- **Macro Estimation**: OpenAI `gpt-4o-mini` + Indian Food DB fallback (`food-db.js`)
- **Order Handoff**: Swiggy deep link (search URL) — replaced by MCP `update_food_cart` post-approval
- **Hosting**: Vercel (demo URL submitted with Builders Club application)

---

## User Flow

```
┌─────────────────────────────────────────────┐
│  SCREEN 1 — Goal Input                      │
│                                             │
│  Daily Calorie Budget    [ 2000 ] kcal      │
│  Number of Meals Today   [ 3    ]           │
│  Protein Target          [ 120g ]           │
│  Carbs Target            [ 200g ] optional  │
│  Fat Target              [ 65g  ] optional  │
│  Price Budget / Meal     [ ₹300 ]           │
│  Diet Preference    ○ All ○ Veg ○ Non-veg   │
│  Location           [Detect 📍] or [Type]   │
│                                             │
│  Per meal target: ~667 kcal · 40g protein   │  ← live calculation
│                                             │
│         [ Find My Meals → ]                 │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│  SCREEN 2 — Results                         │
│                                             │
│  "14 dishes found across 8 restaurants"     │
│  Sort: [Best Match ▾] [Calories] [Protein]  │
│        [Price] [Rating]                     │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🟢 92% match                        │    │
│  │ Grilled Chicken Salad               │    │
│  │ The Bowl Company · 4.4★ · 1.2km     │    │
│  │ 612 kcal · 38g protein · ₹285       │    │
│  │ [●●●○] Protein  [●●●○] Calories     │    │
│  │ Source: AI Estimated                │    │
│  │ [ Order on Swiggy ↗ ]              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🟡 78% match                        │    │
│  │ Dal Makhani + 2 Roti                │    │
│  │ Punjab Grill · 4.1★ · 0.8km        │    │
│  │ 580 kcal · 22g protein · ₹220       │    │
│  │ Source: Food DB (ICMR-NIN)          │    │
│  │ [ Order on Swiggy ↗ ]              │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
          ↓ (post Swiggy MCP approval — v3)
┌─────────────────────────────────────────────┐
│  SCREEN 3 — Order (v3 only)                 │
│  [ Add to Swiggy Cart ] → place order       │
│  natively without leaving app               │
└─────────────────────────────────────────────┘
```

---

## Google Places API Integration

### Step 1 — Nearby Restaurant Search
```javascript
POST https://places.googleapis.com/v1/places:searchNearby
Headers: {
  "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.priceLevel,places.formattedAddress,places.location,places.currentOpeningHours",
  "X-Goog-Api-Key": VITE_GOOGLE_PLACES_API_KEY
}
Body: {
  includedTypes: ["restaurant", "meal_delivery", "meal_takeaway"],
  maxResultCount: 10,  // keep low for demo speed
  locationRestriction: {
    circle: {
      center: { latitude: USER_LAT, longitude: USER_LNG },
      radius: 2000
    }
  }
}
```

### Step 2 — Fetch Menu per Restaurant
```javascript
GET https://places.googleapis.com/v1/places/{PLACE_ID}
Headers: {
  "X-Goog-FieldMask": "displayName,businessMenus",
  "X-Goog-Api-Key": VITE_GOOGLE_PLACES_API_KEY
}
```

Response shape (when available):
```json
{
  "businessMenus": [{
    "sections": [{
      "items": [{
        "name": "Grilled Chicken Salad",
        "description": "Grilled chicken breast, romaine lettuce, cherry tomatoes, olive oil dressing",
        "price": { "units": "285", "currencyCode": "INR" },
        "attributes": {
          "nutritionFacts": {
            "calories": { "lowerAmount": 580, "upperAmount": 650, "unit": "CALORIE" },
            "protein": { "lowerAmount": 35, "upperAmount": 42, "unit": "GRAM" }
          }
        }
      }]
    }]
  }]
}
```

**Reality check**: Most restaurants won't have `businessMenus`. The fallback pipeline below handles this — expect 70-80% of results to come from OpenAI estimation or the food DB.

---

## Macro Estimation Pipeline

### Priority 1 — Places API `nutritionFacts`
If `item.attributes.nutritionFacts` exists, use midpoint of lowerAmount/upperAmount.
Tag card: `Source: Google Menu ✓`

### Priority 2 — Indian Food DB (`food-db.js`)
Keyword match dish name. Longest key match wins.
Returns kcal, protein, carbs, fat, fiber, portionG.
Tag card: `Source: Food DB (ICMR-NIN)`

### Priority 3 — OpenAI Estimation
For dishes not matched by DB. Batch all unmatched dishes from one restaurant into a single API call.

```javascript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${VITE_OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a nutrition expert specialising in Indian restaurant food. Always respond with valid JSON only. Account for restaurant-style cooking — higher oil, butter, and portion sizes vs home cooking."
      },
      {
        role: "user",
        content: `Estimate macros for each dish below. These are from an Indian restaurant.
        
Dishes: ${JSON.stringify(dishes)}  // [{ name, description }]

Respond ONLY with:
{
  "results": [
    {
      "name": "dish name",
      "kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "portion_g": number,
      "confidence": "high" | "medium" | "low"
    }
  ]
}`
      }
    ]
  })
});
```

Tag card: `Source: AI Estimated`

---

## Match Scoring

Per-meal targets = daily targets ÷ num_meals.

```javascript
function matchScore(dish, mealTarget) {
  // Calorie fit — penalise both over and under
  const calDiff = Math.abs(dish.kcal - mealTarget.kcal) / mealTarget.kcal;
  const calScore = Math.max(0, 100 - calDiff * 100);

  // Protein fit — reward hitting target, penalise falling short more than exceeding
  const proteinScore = dish.protein >= mealTarget.protein
    ? 100
    : (dish.protein / mealTarget.protein) * 100;

  // Price fit
  const priceScore = dish.price <= mealTarget.budget
    ? 100
    : Math.max(0, 100 - ((dish.price - mealTarget.budget) / mealTarget.budget) * 100);

  return Math.round(calScore * 0.4 + proteinScore * 0.4 + priceScore * 0.2);
}
```

- Score ≥ 80 → 🟢 Great match
- Score 60–79 → 🟡 Good match  
- Score 40–59 → 🟠 Partial match
- Score < 40 → filtered out

---

## Deep Links (Demo — replaced by MCP in v3)

```javascript
// Swiggy
const swiggyUrl = `https://www.swiggy.com/search?query=${encodeURIComponent(restaurantName)}`;

// Zomato (keep as secondary option in demo)
const zomatoUrl = `https://www.zomato.com/search?q=${encodeURIComponent(restaurantName + ' ' + area)}`;
```

Both open in new tab. Show Swiggy as primary CTA, Zomato as secondary link.

---

## v3 — Swiggy MCP (implemented)
> Status as of this build. Access approved; discovery now runs live on Swiggy MCP.

Swiggy MCP is a **remote HTTP** server (`https://mcp.swiggy.com/food`) with **per-user OAuth** —
there is no anonymous/service-token mode. The app connects an MCP client **server-side** (one
session per search) and calls tools deterministically; no LLM drives the tools.

**What shipped (rn — restaurant-centric):**

| Demo (v2, Google Places) | v3 (Swiggy MCP, now) |
|---|---|
| Google Places Nearby Search | `search_restaurants` — live, delivery-aware, real ratings/offers/ETAs |
| Detect/type location + Google geocode | `get_addresses` — user's saved Swiggy addresses (no lat/lng needed) |
| Places `businessMenus` (70–80% empty) + OpenAI/web-search fallbacks | **deleted** — real menu data makes the estimation scaffolding unnecessary |
| Price guessed from `priceLevel` | real `costForTwo` from Swiggy, used for budget filtering |
| Deep link `search?query=name` | deep link from the **real Swiggy restaurant identity** |

**Auth rollout:** (A) **now** — local-live: developer OAuths their own Swiggy account via the
already-whitelisted `localhost` redirect; the public deploy shows clearly-labelled sample
fallback data. (C) **next** — per-visitor OAuth once the production domain is whitelisted. The
auth/session layer sits behind its own seam so this is a swap, not a rewrite.

**Deferred (next steps, not blockers):**
- **Veg/non-veg** filtering — `search_restaurants` carries no veg data; belongs at the dish
  level via `search_menu` (`vegFilter`) in the menu drilldown.
- **Macro matching** — Swiggy exposes no nutrition, so calorie/protein matching returns as a
  phase-2 layer (food DB + OpenAI `gpt-4o-mini`) over live menu data. Code is quarantined,
  unwired, behind the seam.
- **Native ordering** — `update_food_cart` + `place_food_order` (COD) to replace the deep link.

---

## UI Components

### Input Screen
- Calorie input with quick presets: [1500] [1800] [2000] [2500]
- Meal count selector: 1–5 pill buttons
- Macro inputs: protein (required), carbs + fat (optional, show "optional" label)
- Price budget: ₹ input with slider (₹100–₹1000)
- Diet toggle: All / Veg / Non-veg
- Location: browser geolocation button + manual text fallback
- Live "per meal" calculation shown below inputs
- Single "Find My Meals" CTA

### Results Screen
- Loading: progressive — "Finding restaurants nearby… Scanning menus… Estimating nutrition…"
- Results count header: "X dishes found across Y restaurants"
- Sort bar: Best Match (default) / Calories / Protein / Price / Rating
- Dish cards (see wireframe above)
- Each card: match score badge, dish name, restaurant name + rating + distance, macro pills (kcal/protein/carbs/fat), price, source label, Swiggy CTA button
- Empty state: "No dishes matched your targets nearby. Try increasing your calorie budget or distance."

### Settings (gear icon, top right)
- Google Places API key
- OpenAI API key
- Both stored in localStorage
- "Test connection" button for each

---

## Performance Targets (Demo)
- First results visible: < 4 seconds on 4G
- Max API calls per search: 1 Nearby Search + 10 Place Details + 1–3 OpenAI batched calls
- Cap restaurants at 10 for demo to keep latency manageable
- Cache restaurant menu data in sessionStorage (same session, same restaurant = no re-fetch)

---

## Environment Variables
```
VITE_GOOGLE_PLACES_API_KEY=your_key_here
VITE_OPENAI_API_KEY=your_key_here
```

Both entered via Settings screen in the UI — no hardcoding, no .env required for demo users.

---

## What the Demo Proves (for Swiggy Application)
1. Real restaurant discovery from user location ✅
2. Dish-level macro matching with multiple data sources ✅
3. Price filtering against budget ✅
4. Clean UX that drives to Swiggy for ordering ✅
5. Full architecture ready to swap deep links for native MCP calls ✅

The demo URL + this PRD + the v3 MCP upgrade plan constitute the application to Swiggy Builders Club.

---

## Out of Scope (Demo)
- User accounts / auth
- Order history
- Nutritional tracking over time
- Swiggy MCP native ordering (v3)
- Zomato API integration
