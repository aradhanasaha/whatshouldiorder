// Client-side calls into the server MCP layer. The browser never sees credentials or the
// MCP endpoint — it only talks to our own /api/* routes.

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Load the signed-in user's saved Swiggy addresses (most-recent first). */
export async function fetchAddresses() {
  const { ok, status, data } = await postJson('/api/addresses', {});
  return { ok, status, addresses: data.addresses || [], error: data.error || null, mode: data.mode };
}

/** Discover restaurants for a cuisine within budget, near the chosen address. */
export async function discover({ addressId, cuisine, budget, veg }) {
  const { ok, status, data } = await postJson('/api/discover', { addressId, cuisine, budget, veg });
  return {
    ok,
    status,
    restaurants: data.restaurants || [],
    vegApplied: data.vegApplied ?? false,
    error: data.error || null,
    mode: data.mode,
  };
}
