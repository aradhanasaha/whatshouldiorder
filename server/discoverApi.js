// Dish-centric discovery. Each call opens ONE MCP session (one OAuth handshake, not N+1),
// searches dishes for the craving, enriches with restaurant rating/distance, ranks them with
// the deterministic history-aware model, and returns an "Order again" list from past orders.

import { openTransport } from './mcp/transport.js';
import { getSession } from './mcp/auth.js';
import { buildHistoryProfile, getAddresses, getFoodCart, getRestaurantMenu, searchRestaurants, swiggyDeepLink, updateFoodCart } from './mcp/swiggyFood.js';
import { courseFromCategory, pickComplements } from './complements.js';
import { rankDishes } from './ranking.js';
import { filterByDishCategory } from './dishKeywords.js';

// How many top restaurants to expand into menus per search (bounds latency of the N menu calls).
const MENU_FANOUT = 6;

// Some cravings aren't queries that return restaurants ("desserts"/"bakery" return dish stubs).
// Map them to terms that DO return real restaurants; a term with no mapping searches as-is.
const CUISINE_QUERIES = {
  desserts: ['cake', 'ice cream'],
};
const queriesFor = (c) => CUISINE_QUERIES[c.toLowerCase().trim()] || [c];

// Per-address history cache — history is N+1 MCP calls, so fetch once and reuse across searches.
const HISTORY_TTL_MS = 10 * 60 * 1000;
const historyCache = new Map(); // key: `${mode}:${addressId}` -> { profile, ts }

async function ensureHistory(transport, addressId, mode) {
  const key = `${mode}:${addressId}`;
  const hit = historyCache.get(key);
  if (hit && Date.now() - hit.ts < HISTORY_TTL_MS) return hit.profile;

  try {
    const profile = await buildHistoryProfile(transport, { addressId });
    historyCache.set(key, { profile, ts: Date.now() });
    return profile;
  } catch {
    return null; // history is best-effort personalization; ranking still works without it
  }
}

export async function handleGetAddresses(_body, env = {}, req = null) {
  const session = getSession(env, req);
  if (!session) return { status: 401, payload: { error: 'not_authenticated', addresses: [] } };

  const transport = await openTransport(env, session);
  try {
    const addresses = await getAddresses(transport);
    return { status: 200, payload: { addresses, mode: session.mode } };
  } catch (error) {
    return { status: 502, payload: { error: error.message || 'get_addresses failed', addresses: [] } };
  } finally {
    await transport.close();
  }
}

// Short-lived menu cache so complement lookups / order-again resolution don't refetch every tap.
const MENU_TTL_MS = 5 * 60 * 1000;
const menuCache = new Map(); // `${addressId}:${restaurantId}` -> { menu, ts }

/**
 * Swiggy lists the same dish under several categories (e.g. "Recommended" AND "Saver Sides"),
 * so the flattened menu has duplicate ids. Keep one per id, preferring the copy whose category
 * actually names a course (better complement pairing than "Recommended").
 */
function dedupeMenu(menu) {
  const byId = new Map();
  for (const d of menu) {
    const prev = byId.get(d.id);
    if (!prev) {
      byId.set(d.id, d);
    } else if (courseFromCategory(prev.category) === 'unknown' && courseFromCategory(d.category) !== 'unknown') {
      byId.set(d.id, d);
    }
  }
  return [...byId.values()];
}

async function menuFor(transport, addressId, restaurantId) {
  const key = `${addressId}:${restaurantId}`;
  const hit = menuCache.get(key);
  if (hit && Date.now() - hit.ts < MENU_TTL_MS) return hit.menu;
  const menu = dedupeMenu(await getRestaurantMenu(transport, { addressId, restaurantId }));
  menuCache.set(key, { menu, ts: Date.now() });
  return menu;
}

/**
 * Add one dish to the user's real Swiggy cart.
 * IMPORTANT: Swiggy silently REPLACES the cart when you add from a different restaurant, so we
 * pre-check and return 409 unless `force` is set — otherwise users lose their cart with no warning.
 * The cart response has no restaurant id/name, so we detect "different restaurant" by testing
 * whether the cart's item ids exist in this restaurant's menu.
 */
export async function handleAddToCart(body = {}, env = {}, req = null) {
  const { addressId, restaurantId, restaurantName, itemId, quantity = 1, force = false, veg = 'all' } = body;
  if (!addressId || !restaurantId || !itemId) {
    return { status: 400, payload: { error: 'addressId, restaurantId and itemId are required' } };
  }

  const session = getSession(env, req);
  if (!session) return { status: 401, payload: { error: 'not_authenticated' } };

  const transport = await openTransport(env, session);
  try {
    const menu = await menuFor(transport, addressId, restaurantId);

    if (!force) {
      const cart = await getFoodCart(transport, { addressId }).catch(() => null);
      if (cart?.itemCount > 0) {
        const here = new Set(menu.map((d) => String(d.id)));
        const fromOther = cart.items.filter((i) => !here.has(String(i.id)));
        if (fromOther.length === cart.items.length) {
          return {
            status: 409,
            payload: {
              ok: false,
              conflict: true,
              currentItems: cart.items.map((i) => i.name),
              message: "You're selecting from a different place, it will reset your cart",
            },
          };
        }
      }
    }

    const r = await updateFoodCart(transport, { addressId, restaurantId, restaurantName, itemId, quantity });
    if (!r.ok) return { status: 502, payload: { ok: false, message: r.message } };

    const added = menu.find((d) => String(d.id) === String(itemId)) || { id: itemId };
    // Don't suggest anything already sitting in the cart.
    const inCartIds = (r.raw?.data?.items || []).map((i) => String(i.menu_item_id));
    const complements = pickComplements(menu, added, { veg, excludeIds: inCartIds });

    return {
      status: 200,
      payload: { ok: true, message: r.message, cart: r.cart, complements, cartUrl: 'https://www.swiggy.com/cart' },
    };
  } catch (error) {
    return { status: 502, payload: { ok: false, error: error.message || 'add to cart failed' } };
  } finally {
    await transport.close();
  }
}

/** Match a remembered dish name to a live menu item (history has no usable menu_item_id). */
function findByName(menu, dishName) {
  const n = String(dishName || '').toLowerCase().trim();
  if (!n) return null;
  const exact = menu.find((d) => d.name.toLowerCase().trim() === n);
  if (exact) return exact;
  const contains = menu.find((d) => d.name.toLowerCase().includes(n) || n.includes(d.name.toLowerCase()));
  if (contains) return contains;
  // Best token overlap.
  const tokens = new Set(n.split(/\W+/).filter((t) => t.length > 2));
  let best = null;
  let bestScore = 0;
  for (const d of menu) {
    const dt = new Set(d.name.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
    const overlap = [...tokens].filter((t) => dt.has(t)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = d;
    }
  }
  return bestScore >= 2 ? best : null;
}

/** "Order again": resolve a past dish name against the restaurant's live menu, then add it. */
export async function handleAddOrderAgain(body = {}, env = {}, req = null) {
  const { addressId, restaurantId, dishName, force = false, veg = 'all' } = body;
  if (!addressId || !restaurantId || !dishName) {
    return { status: 400, payload: { error: 'addressId, restaurantId and dishName are required' } };
  }

  const session = getSession(env, req);
  if (!session) return { status: 401, payload: { error: 'not_authenticated' } };

  const transport = await openTransport(env, session);
  let match;
  try {
    const menu = await menuFor(transport, addressId, restaurantId);
    match = findByName(menu, dishName);
    if (!match) {
      return { status: 404, payload: { ok: false, message: `"${dishName}" isn't on the menu right now` } };
    }
  } catch (error) {
    return { status: 502, payload: { ok: false, error: error.message || 'menu lookup failed' } };
  } finally {
    await transport.close();
  }

  // Reuse the normal path (conflict check, complements, cart summary).
  return handleAddToCart({ addressId, restaurantId, itemId: match.id, force, veg }, env, req);
}

export async function handleDiscover(body = {}, env = {}, req = null) {
  const { addressId, cuisine = '', budget = null, veg = 'all' } = body;

  if (!addressId) return { status: 400, payload: { error: 'addressId is required', dishes: [] } };
  if (!cuisine.trim()) return { status: 400, payload: { error: 'a craving/cuisine is required', dishes: [] } };

  const session = getSession(env, req);
  if (!session) return { status: 401, payload: { error: 'not_authenticated', dishes: [] } };

  const transport = await openTransport(env, session);
  try {
    const profile = await ensureHistory(transport, addressId, session.mode);

    // Discovery = craving → restaurants → each restaurant's real menu → dishes.
    // NOTE on Swiggy behaviour: search_restaurants adapts to the query. A CUISINE ("chinese")
    // returns real restaurants (with rating/distance/costForTwo). A specific DISH ("momo") or a
    // dish-shaped term ("desserts") returns thin dish *stubs* that can't be expanded — so we map
    // such cravings to restaurant-returning terms (queriesFor) and keep only real restaurants.
    const terms = queriesFor(cuisine);
    const found = (await Promise.all(terms.map((q) => searchRestaurants(transport, { addressId, query: q }).catch(() => [])))).flat();
    const byId = new Map();
    for (const r of found) {
      if ((r.rating != null || r.costForTwo != null) && !byId.has(r.id)) byId.set(r.id, r);
    }
    const top = [...byId.values()].slice(0, MENU_FANOUT);

    const menus = await Promise.all(
      top.map((r) =>
        getRestaurantMenu(transport, { addressId, restaurantId: r.id })
          .then((items) =>
            items.map((d) => ({
              ...d,
              rating: d.rating ?? r.rating ?? null, // prefer per-dish rating, fall back to restaurant
              distanceKm: r.distanceKm ?? null, // distance is restaurant-level only
              restaurantId: r.id,
              restaurantName: r.name,
              cuisines: r.cuisines || [],
              imageUrl: d.imageUrl || r.imageUrl || null,
              availabilityStatus: d.inStock ? 'OPEN' : 'CLOSED',
              source: 'Swiggy',
              swiggyUrl: r.swiggyUrl,
            }))
          )
          .catch(() => [])
      )
    );

    let dishes = menus.flat();

    // Dedupe (same dish can appear in multiple menu categories).
    const seen = new Set();
    dishes = dishes.filter((d) => {
      const k = `${d.restaurantId}:${d.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Category dictionary first (e.g. "Desserts" → keep only cake/pastry/mithai dishes, dropping
    // the idli/dosa that sweet shops also list). Falls back to name-narrowing for specific-dish
    // cravings; broad cuisines keep the whole matched-restaurant pool for ranking to sort.
    const categoryFiltered = filterByDishCategory(dishes, cuisine);
    if (categoryFiltered) {
      if (categoryFiltered.length) dishes = categoryFiltered;
    } else {
      const q = cuisine.toLowerCase().trim();
      const named = dishes.filter((d) => d.name.toLowerCase().includes(q));
      if (named.length >= 4) dishes = named;
    }

    // Hard filters: budget, in-stock, veg.
    if (typeof budget === 'number') dishes = dishes.filter((d) => d.price == null || d.price <= budget);
    dishes = dishes.filter((d) => d.availabilityStatus === 'OPEN');
    if (veg === 'veg') dishes = dishes.filter((d) => d.isVeg === true);
    if (veg === 'non-veg') dishes = dishes.filter((d) => d.isVeg === false);

    const ranked = rankDishes(dishes, profile).slice(0, 60); // cap the grid

    // "Order again" = your recent past orders that are relevant to this craving (matched on the
    // restaurant's cuisines / the query terms), so it appears whenever you have a fitting past
    // order — but a "Desserts" search never shows a past chicken order. Chips deep-link to Swiggy.
    const termsLc = terms.map((t) => t.toLowerCase());
    const ql = cuisine.toLowerCase().trim();
    const relevant = (d) => {
      const cz = d.cuisines || []; // already lowercased in buildHistoryProfile
      if (cz.some((c) => termsLc.includes(c) || c.includes(ql) || ql.includes(c))) return true;
      const n = d.name.toLowerCase();
      return n.includes(ql) || termsLc.some((t) => n.includes(t));
    };
    const orderAgain = (profile?.recentDishes || [])
      .filter(relevant)
      .slice(0, 6)
      .map((d) => ({
        name: d.name,
        restaurantName: d.restaurantName,
        swiggyUrl: swiggyDeepLink({ restaurantId: d.restaurantId, restaurantName: d.restaurantName }),
      }));

    return { status: 200, payload: { dishes: ranked, orderAgain, mode: session.mode, vegApplied: true } };
  } catch (error) {
    return { status: 502, payload: { error: error.message || 'discover failed', dishes: [] } };
  } finally {
    await transport.close();
  }
}
