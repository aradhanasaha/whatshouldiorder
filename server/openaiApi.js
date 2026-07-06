// QUARANTINED (phase 2): macro estimation. Not called by the rn Swiggy-MCP discovery flow.
// It stays reachable at /api/estimate-macros so the phase-2 health/macro layer can switch it
// back on over live Swiggy menu data. The old Places/web-search restaurant fallback that used
// to live here was removed with the Google Places layer.

export function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

async function estimateMacroBatch(apiKey, dishes) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a nutrition expert specialising in Indian restaurant food. Always respond with valid JSON only. Account for restaurant-style cooking with higher oil, butter, and portion sizes than home cooking.',
        },
        {
          role: 'user',
          content: `Estimate macros for each dish. These are from an Indian restaurant.

Dishes: ${JSON.stringify(dishes)}

Respond ONLY with:
{"results":[{"name":"dish name","kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"portion_g":number,"confidence":"high"|"medium"|"low"}]}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{"results":[]}');
}

export function getApiKey(env = {}, body = {}) {
  return env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || body.apiKey || '';
}

export async function handleEstimateMacros(body, env = {}) {
  const apiKey = getApiKey(env, body);

  if (!apiKey) {
    return { status: 400, payload: { error: 'Missing OpenAI API key.' } };
  }

  if (body.ping) {
    const ping = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return { status: ping.ok ? 200 : 401, payload: { ok: ping.ok } };
  }

  const dishes = Array.isArray(body.dishes) ? body.dishes : [];

  if (!dishes.length) {
    return { status: 200, payload: { results: [] } };
  }

  try {
    const result = await estimateMacroBatch(apiKey, dishes);
    return { status: 200, payload: result };
  } catch (error) {
    return { status: 500, payload: { error: error.message || 'Failed to estimate macros.' } };
  }
}
