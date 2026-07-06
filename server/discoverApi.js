// Coarse discovery handlers. Each call opens ONE MCP session, does its work, and closes —
// matching the serverless-per-request model (one OAuth handshake per search, not N+1).
//
// rn build: cuisine + budget + veg → dishes across restaurants via search_menu. No macros.

import { openTransport } from './mcp/transport.js';
import { getSession } from './mcp/auth.js';
import { getAddresses, searchRestaurants } from './mcp/swiggyFood.js';

function sortByRatingThenDistance(items) {
  return [...items].sort((a, b) => {
    if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
    const da = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
    const db = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    return (a.costForTwo ?? Number.MAX_SAFE_INTEGER) - (b.costForTwo ?? Number.MAX_SAFE_INTEGER);
  });
}

export async function handleGetAddresses(_body, env = {}, req = null) {
  const session = getSession(env, req);
  if (!session) {
    return { status: 401, payload: { error: 'not_authenticated', addresses: [] } };
  }

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

export async function handleDiscover(body = {}, env = {}, req = null) {
  const { addressId, cuisine = '', budget = null, veg = 'all' } = body;

  if (!addressId) {
    return { status: 400, payload: { error: 'addressId is required', dishes: [] } };
  }

  const session = getSession(env, req);
  if (!session) {
    return { status: 401, payload: { error: 'not_authenticated', dishes: [] } };
  }

  const transport = await openTransport(env, session);
  try {
    let restaurants = await searchRestaurants(transport, { addressId, query: cuisine });

    // Budget filter against costForTwo (restaurant-level; the only price signal this tool
    // returns). Keep rows with unknown cost rather than dropping them.
    if (typeof budget === 'number') {
      restaurants = restaurants.filter((r) => r.costForTwo == null || r.costForTwo <= budget);
    }

    // NOTE: search_restaurants has no veg data, so `veg` cannot be honored at this layer.
    // vegApplied=false tells the UI to surface that. Dish-level veg needs search_menu.
    return {
      status: 200,
      payload: {
        restaurants: sortByRatingThenDistance(restaurants),
        mode: session.mode,
        vegApplied: false,
      },
    };
  } catch (error) {
    return { status: 502, payload: { error: error.message || 'discover failed', restaurants: [] } };
  } finally {
    await transport.close();
  }
}
