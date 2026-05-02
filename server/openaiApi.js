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

async function restaurantFallbackViaSearch(apiKey, payload) {
  const input = `You are helping a user choose food from a restaurant.

Restaurant: ${payload.restaurantName}
Location hint: ${payload.locationText || 'Unknown'}
Diet: ${payload.diet || 'all'}
Goal calories per meal: ${payload.mealTarget?.kcal ?? 'Unknown'}
Goal protein per meal: ${payload.mealTarget?.protein ?? 'Unknown'}
Budget per meal INR: ${payload.mealTarget?.budget ?? 'Unknown'}

Use web search results if available to infer likely dishes sold by this restaurant. Return the top 3 dishes that best fit the user's goals.

Respond ONLY with JSON:
{"dishes":[{"name":"dish name","description":"short description","price":number,"kcal":number,"protein":number,"carbs":number,"fat":number,"source":"Web Search"}]}`;

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      tools: [{ type: 'web_search_preview' }],
      input,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI responses ${res.status}`);
  }

  const data = await res.json();
  return JSON.parse(data.output_text || '{"dishes":[]}');
}

async function restaurantFallbackViaChat(apiKey, payload) {
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
            'You recommend likely restaurant dishes and estimate their nutrition. Always respond with valid JSON only. Treat menu presence and nutrition as estimates.',
        },
        {
          role: 'user',
          content: `Restaurant: ${payload.restaurantName}
Location hint: ${payload.locationText || 'Unknown'}
Diet: ${payload.diet || 'all'}
Goal calories per meal: ${payload.mealTarget?.kcal ?? 'Unknown'}
Goal protein per meal: ${payload.mealTarget?.protein ?? 'Unknown'}
Budget per meal INR: ${payload.mealTarget?.budget ?? 'Unknown'}

Infer the 3 most likely dishes this restaurant sells that best fit the user's goals. Return reasonable estimated macros and price.

Respond ONLY with JSON:
{"dishes":[{"name":"dish name","description":"short description","price":number,"kcal":number,"protein":number,"carbs":number,"fat":number,"source":"Web Search"}]}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{"dishes":[]}');
}

export function getApiKey(env = {}, body = {}) {
  return env.VITE_OPENAI_API_KEY || body.apiKey || '';
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

export async function handleRestaurantFallback(body, env = {}) {
  const apiKey = getApiKey(env, body);

  if (!apiKey) {
    return { status: 400, payload: { error: 'Missing OpenAI API key.' } };
  }

  try {
    const result = await restaurantFallbackViaSearch(apiKey, body);
    return { status: 200, payload: result };
  } catch {
    try {
      const result = await restaurantFallbackViaChat(apiKey, body);
      return { status: 200, payload: result };
    } catch (error) {
      return { status: 500, payload: { error: error.message || 'Failed restaurant fallback.' } };
    }
  }
}
