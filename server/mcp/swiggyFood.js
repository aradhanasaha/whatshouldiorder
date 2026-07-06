// Typed wrappers over the Swiggy Food MCP tools + normalizers into the app's internal
// records. Everything above this layer (discoverApi, the React app) deals only in the
// normalized `dish` shape, never raw MCP payloads — so if Swiggy's field names differ from
// the docs, this is the single file to reconcile once real samples are captured.
//
// Internal dish record (rn build — no macros; those return in phase 2):
//   { id, name, price, isVeg, restaurantId, restaurantName, rating, distanceKm,
//     hasVariants, hasAddons, source: 'Swiggy', swiggyUrl }

/** Build the "Order on Swiggy" link from the real Swiggy restaurant identity. */
export function swiggyDeepLink({ restaurantId, restaurantName }) {
  // TODO(live): confirm Swiggy's canonical restaurant URL pattern from a real response and
  // use restaurantId directly (e.g. https://www.swiggy.com/restaurants/<slug>-<id>). Until
  // then, a name search is the safest deep link that always resolves.
  if (restaurantName) {
    return `https://www.swiggy.com/search?query=${encodeURIComponent(restaurantName)}`;
  }
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
 * Dish-level search across restaurants, with native veg filtering. Field mapping for the
 * returned dishes is NOT yet confirmed against a real response — reconcile once captured.
 */
export async function searchMenu(transport, { addressId, query, veg }) {
  const args = { addressId, query };
  if (veg === 'veg') args.vegFilter = 1; // veg-only. No native non-veg-only filter exists.
  const data = await transport.callTool('search_menu', args);
  return (data.dishes || []).map((raw) => ({
    id: raw.id ?? `${raw.restaurantId}-${raw.name}`,
    name: raw.name,
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || null,
    isVeg: raw.isVeg ?? null,
    restaurantId: raw.restaurantId ?? null,
    restaurantName: raw.restaurantName ?? '',
    rating: raw.rating ?? raw.avgRating ?? null,
    distanceKm: raw.distanceKm ?? null,
    source: 'Swiggy',
    swiggyUrl: swiggyDeepLink({ restaurantId: raw.restaurantId, restaurantName: raw.restaurantName }),
  }));
}
