// Deterministic dish-ranking model. No LLM — a transparent weighted score over three signals:
// restaurant rating, delivery distance, and the user's past-order history. Tune via the
// constants below.
//
// Operates on enriched internal dish records:
//   { id, name, price, isVeg, restaurantId, restaurantName, rating, distanceKm,
//     cuisines?, imageUrl?, availabilityStatus, ... }
// and a HistoryProfile (see buildHistoryProfile in server/mcp/swiggyFood.js):
//   { orderedDishCounts:Map, restaurantCounts:Map, cuisineCounts:Map, topCuisines:string[] }

export const WEIGHTS = { rating: 0.45, distance: 0.25, history: 0.3 };
export const DISTANCE_HORIZON_KM = 8; // beyond this, DistanceScore floors at 0
export const FREQ_CAP = 3; // orders needed to reach full recency/frequency lift

export function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/** History affinity for one dish → { base, reason }. base ∈ {1.0, 0.7, 0.4, 0}. */
function historyAffinity(dish, profile) {
  if (!profile) return { base: 0, reason: null, count: 0 };

  const key = normalizeName(dish.name);
  const dishCount = profile.orderedDishCounts?.get(key) || 0;
  if (dishCount > 0) {
    return { base: 1.0, reason: 'Ordered before', count: dishCount };
  }

  const restCount = dish.restaurantId ? profile.restaurantCounts?.get(String(dish.restaurantId)) || 0 : 0;
  if (restCount > 0) {
    return { base: 0.7, reason: `From ${dish.restaurantName || 'a spot'} you like`, count: restCount };
  }

  const cuisines = (dish.cuisines || []).map((c) => c.toLowerCase());
  const top = profile.topCuisines || [];
  if (cuisines.some((c) => top.includes(c))) {
    return { base: 0.4, reason: 'Popular cuisine for you', count: 1 };
  }

  return { base: 0, reason: null, count: 0 };
}

/** Score one dish 0–100 and attach a human reason. */
export function scoreDish(dish, profile) {
  const ratingScore = (dish.rating ?? 0) / 5;
  const distanceScore = dish.distanceKm == null ? 0.5 : clamp01(1 - dish.distanceKm / DISTANCE_HORIZON_KM);

  const aff = historyAffinity(dish, profile);
  const historyScore = aff.base * Math.min(1, aff.count / FREQ_CAP || 0);

  const score = Math.round(
    100 * (WEIGHTS.rating * ratingScore + WEIGHTS.distance * distanceScore + WEIGHTS.history * historyScore)
  );

  // Prefer a history-driven reason; otherwise fall back to a quality/proximity note.
  let reason = aff.reason;
  if (!reason) {
    if ((dish.rating ?? 0) >= 4.3) reason = 'Top rated nearby';
    else if (dish.distanceKm != null && dish.distanceKm <= 2) reason = 'Close to you';
  }

  return { ...dish, score, reason, _historyBase: aff.base };
}

/** Score + sort. Tie-break: rating desc → distance asc → price asc. */
export function rankDishes(dishes, profile) {
  return dishes
    .map((d) => scoreDish(d, profile))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
      const da = a.distanceKm ?? Infinity;
      const db = b.distanceKm ?? Infinity;
      if (da !== db) return da - db;
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
}
