// Typed wrappers over the Swiggy Food MCP tools + normalizers into the app's internal
// records. Everything above this layer (discoverApi, the React app) deals only in the
// normalized `dish` shape, never raw MCP payloads — so if Swiggy's field names differ from
// the docs, this is the single file to reconcile once real samples are captured.
//
// Internal dish record (rn build — no macros; those return in phase 2):
//   { id, name, price, isVeg, restaurantId, restaurantName, rating, distanceKm,
//     hasVariants, hasAddons, source: 'Swiggy', swiggyUrl }

/**
 * "Order on Swiggy" link. `https://www.swiggy.com/menu/<restaurantId>` is the real menu page
 * (verified 200); on Android this opens the Swiggy app via app links. Falls back to a name
 * search only when we have no restaurantId.
 */
export function swiggyDeepLink({ restaurantId, restaurantName }) {
  if (restaurantId) return `https://www.swiggy.com/menu/${restaurantId}`;
  if (restaurantName) return `https://www.swiggy.com/search?query=${encodeURIComponent(restaurantName)}`;
  return 'https://www.swiggy.com';
}

/** "₹700 for two" -> 700 (number), or null if unparseable. */
export function parseCostForTwo(costForTwo) {
  if (typeof costForTwo === 'number') return costForTwo;
  const m = String(costForTwo || '').match(/(\d[\d,]*)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

/** Field names below confirmed against a real search_restaurants response (2026-07). */
function normalizeRestaurant(raw) {
  // Swiggy tags promoted results with a trailing "(Ad)" — strip for display + deep link.
  const name = (raw.name || '').replace(/\s*\(Ad\)\s*$/i, '').trim();
  return {
    id: String(raw.id),
    name,
    cuisines: raw.cuisines || [],
    rating: raw.avgRating ?? null,
    totalRatings: raw.totalRatings ?? null,
    costForTwo: parseCostForTwo(raw.costForTwo),
    costForTwoLabel: raw.costForTwo ?? null,
    areaName: raw.areaName ?? '',
    distanceKm: raw.distanceKm ?? null,
    deliveryTimeMinutes: raw.deliveryTimeMinutes ?? null,
    offer: raw.offer ?? null,
    imageUrl: raw.imageUrl ?? null,
    availabilityStatus: raw.availabilityStatus ?? 'OPEN',
    source: 'Swiggy',
    swiggyUrl: swiggyDeepLink({ restaurantId: raw.id, restaurantName: name }),
  };
}

export async function getAddresses(transport) {
  const data = await transport.callTool('get_addresses', {});
  const list = data.addresses || [];
  // Returned in Swiggy's own order; the first is the sensible default selection.
  // TODO(pagination): data.pagination.hasMore is true past 10 — wire page=2 if we want all 14.
  return list.map((a) => ({
    id: a.id,
    label: a.addressTag || a.addressCategory || 'Address',
    address: a.addressLine || '',
    category: a.addressCategory ?? null,
  }));
}

export async function searchRestaurants(transport, { addressId, query, offset = 0 }) {
  const data = await transport.callTool('search_restaurants', { addressId, query, offset });
  return (data.restaurants || []).map(normalizeRestaurant);
}

/**
 * Menu for one restaurant. Field mapping CONFIRMED against real get_restaurant_menu responses
 * (2026-07). Two shapes seen: a flat `items[]`, or `categories[].items[]` (menu grouped by
 * category). Each item: id/menu_item_id, name, description?, price(number), isVeg(boolean),
 * rating(string), imageUrl, inStock(1/0), hasVariants/hasAddons. Returns dish records WITHOUT
 * restaurant context (caller attaches distance/name/cuisines).
 */
export async function getRestaurantMenu(transport, { addressId, restaurantId, page = 1, pageSize = 8 }) {
  const data = await transport.callTool('get_restaurant_menu', { addressId, restaurantId, page, pageSize });

  // Keep the category title — it's one signal for complement pairing. NOTE: Swiggy titles are often
  // promotional ("Minimum 50% off", "IPL Packs") rather than courses, so complements.js also infers
  // the course from the dish name.
  let raw = [];
  if (Array.isArray(data.items)) raw = data.items.map((it) => ({ ...it, __category: null }));
  else if (Array.isArray(data.categories))
    raw = data.categories.flatMap((c) => (c.items || []).map((it) => ({ ...it, __category: c.title || null })));
  else if (Array.isArray(data.menu)) raw = data.menu.map((it) => ({ ...it, __category: null }));

  return raw
    .map((it) => ({
      id: String(it.id ?? it.menu_item_id ?? `${restaurantId}-${it.name}`),
      name: it.name ?? '',
      category: it.__category,
      description: it.description ?? '',
      price: typeof it.price === 'number' ? it.price : Number(it.price) || null,
      isVeg: it.isVeg === true, // explicit boolean in categorized shape; true-or-absent in flat shape
      imageUrl: it.imageUrl ?? null,
      rating: it.rating != null && it.rating !== '' ? Number(it.rating) : null, // per-dish rating (string)
      inStock: it.inStock !== 0,
      hasVariants: Boolean(it.hasVariants),
      hasAddons: Boolean(it.hasAddons),
    }))
    .filter((d) => d.name);
}

/**
 * Dish-level search across restaurants, with native veg filtering. Field mapping for the
 * returned dishes is NOT yet confirmed against a real response — reconcile once captured.
 * (UNCONFIRMED fields flagged below; rating/distanceKm may instead need enrichment via
 * searchRestaurants join — see discoverApi.)
 */
export async function searchMenu(transport, { addressId, query, veg }) {
  const args = { addressId, query };
  if (veg === 'veg') args.vegFilter = 1; // veg-only. No native non-veg-only filter exists.
  const data = await transport.callTool('search_menu', args);
  const items = data.dishes || data.items || data.results || data.menuItems || data.menu || [];
  return items.map((raw) => ({
    id: String(raw.id ?? `${raw.restaurantId}-${raw.name}`),
    name: raw.name,
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || null,
    isVeg: raw.isVeg ?? null, // UNCONFIRMED
    restaurantId: raw.restaurantId != null ? String(raw.restaurantId) : null,
    restaurantName: raw.restaurantName ?? '', // UNCONFIRMED
    rating: raw.rating ?? raw.avgRating ?? null, // UNCONFIRMED — may come from enrichment
    distanceKm: raw.distanceKm ?? null, // UNCONFIRMED — may come from enrichment
    cuisines: raw.cuisines ?? [], // UNCONFIRMED
    imageUrl: raw.imageUrl ?? null, // UNCONFIRMED
    availabilityStatus: raw.availabilityStatus ?? 'OPEN',
    source: 'Swiggy',
    swiggyUrl: swiggyDeepLink({ restaurantId: raw.restaurantId, restaurantName: raw.restaurantName }),
  }));
}

/**
 * Add an item to the user's real Swiggy cart.
 * CONFIRMED (2026-07): cartItems entries use **`menu_item_id`** — `itemId`/`menuItemId`/`id` are
 * all rejected with INVALID_ITEM_IDS_IN_REQUEST. Success returns statusMessage
 * "CART_UPDATED_SUCCESSFULLY". Items with variants/addons may need explicit selections.
 */
export async function updateFoodCart(transport, { addressId, restaurantId, restaurantName, itemId, quantity = 1 }) {
  const data = await transport.callTool('update_food_cart', {
    restaurantId: String(restaurantId),
    addressId,
    restaurantName: restaurantName || undefined,
    cartItems: [{ menu_item_id: String(itemId), quantity }],
  });
  const ok = data?.statusMessage === 'CART_UPDATED_SUCCESSFULLY' || data?.successful === true;
  const d = data?.data || {};
  return {
    ok,
    message: data?.titleMessage || data?.statusMessage || 'Could not add to cart',
    // Swiggy echoes the address the cart is bound to — surface it so the app can show/verify
    // that WSIO's selected address matches the cart's delivery address.
    cart: ok
      ? {
          restaurantName: d.restaurant?.name || restaurantName || '',
          deliveryTo: d.restaurant?.deliverySubtitle || '',
          itemCount: d.item_count ?? null,
          toPay: d.pricing?.to_pay ?? null,
        }
      : null,
    raw: data,
  };
}

/**
 * Read the user's cart. NOTE: `addressId` is REQUIRED, and the response does NOT include the
 * restaurant's name/id — only items + deliverySubtitle. Callers detect "different restaurant" by
 * checking whether the cart's menu_item_ids exist in the target restaurant's menu.
 */
export async function getFoodCart(transport, { addressId }) {
  const data = await transport.callTool('get_food_cart', { addressId });
  const d = data?.data || {};
  return {
    itemCount: d.item_count ?? 0,
    items: (d.items || []).map((i) => ({ id: String(i.menu_item_id), name: i.name, quantity: i.quantity })),
    deliveryTo: d.restaurant?.deliverySubtitle || '',
    toPay: d.pricing?.to_pay ?? null,
  };
}

// ── Order history (get_food_orders → get_food_order_details) ──
// Item/order field names are UNCONFIRMED — reconcile against a live capture. Kept tolerant:
// normalizers read several plausible keys and fall back gracefully.

export async function getFoodOrders(transport, { addressId, orderCount = 20 }) {
  const data = await transport.callTool('get_food_orders', { addressId, orderCount });
  const list = data.orders || data.foodOrders || [];
  return list.map((o) => ({
    orderId: String(o.orderId ?? o.id ?? ''),
    restaurantId: o.restaurantId != null ? String(o.restaurantId) : null,
    restaurantName: o.restaurantName ?? o.restaurant?.name ?? '',
    orderedAt: o.orderedAt ?? o.orderTime ?? o.createdAt ?? null,
  })).filter((o) => o.orderId);
}

export async function getFoodOrderDetails(transport, { orderId }) {
  const data = await transport.callTool('get_food_order_details', { orderId });
  const order = data.order || data;
  const items = order.items || order.orderItems || [];
  return {
    orderId: String(order.orderId ?? order.id ?? orderId),
    restaurantId: order.restaurantId != null ? String(order.restaurantId) : null,
    restaurantName: order.restaurantName ?? order.restaurant?.name ?? '',
    cuisines: order.cuisines ?? order.restaurant?.cuisines ?? [],
    orderedAt: order.orderedAt ?? order.orderTime ?? order.createdAt ?? null,
    items: items.map((it) => ({
      name: it.name ?? it.dishName ?? it.itemName ?? '',
      itemId: it.itemId != null ? String(it.itemId) : null,
      price: typeof it.price === 'number' ? it.price : Number(it.price) || null,
      quantity: it.quantity ?? it.qty ?? 1,
    })).filter((it) => it.name),
  };
}

/**
 * Build a deterministic history profile from recent orders. N+1 MCP calls (list + details),
 * so callers should cache the result per addressId.
 */
export async function buildHistoryProfile(transport, { addressId, orderCount = 20, detailLimit = 10 }) {
  const orders = await getFoodOrders(transport, { addressId, orderCount });

  const orderedDishCounts = new Map();
  const restaurantCounts = new Map();
  const cuisineCounts = new Map();
  const recentDishes = [];
  const seenRecent = new Set();

  const bump = (map, key) => { if (key) map.set(key, (map.get(key) || 0) + 1); };

  for (const o of orders.slice(0, detailLimit)) {
    let detail;
    try {
      detail = await getFoodOrderDetails(transport, { orderId: o.orderId });
    } catch {
      continue;
    }

    const restId = detail.restaurantId || o.restaurantId;
    bump(restaurantCounts, restId);
    for (const c of detail.cuisines || []) bump(cuisineCounts, String(c).toLowerCase());

    for (const item of detail.items) {
      const norm = item.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      bump(orderedDishCounts, norm);
      if (!seenRecent.has(norm)) {
        seenRecent.add(norm);
        recentDishes.push({
          name: item.name,
          restaurantId: restId || null,
          restaurantName: detail.restaurantName || o.restaurantName || '',
          cuisines: (detail.cuisines || []).map((c) => String(c).toLowerCase()),
          orderedAt: detail.orderedAt || o.orderedAt || null,
        });
      }
    }
  }

  const topCuisines = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  return { orderedDishCounts, restaurantCounts, cuisineCounts, topCuisines, recentDishes };
}
