// QUARANTINED (phase 2): client for the macro-estimation endpoint. Not used by the rn
// Swiggy-MCP discovery flow; kept for the phase-2 health/macro layer.

export async function estimateMacros(dishes, apiKey) {
  const res = await fetch('/api/estimate-macros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dishes, apiKey }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);

  const data = await res.json();
  return data.results || [];
}

export async function testOpenAIKey(apiKey) {
  const res = await fetch('/api/estimate-macros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, ping: true, dishes: [] }),
  });

  return res.ok;
}
