export async function estimateMacros(dishes, apiKey) {
  const res = await fetch('/api/estimate-macros', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dishes,
      apiKey,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);

  const data = await res.json();
  return data.results || [];
}

export async function findRestaurantFallbackDishes(payload, apiKey) {
  const res = await fetch('/api/restaurant-web-fallback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      apiKey,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);

  const data = await res.json();
  return data.dishes || [];
}

export async function testOpenAIKey(apiKey) {
  const res = await fetch('/api/estimate-macros', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      ping: true,
      dishes: [],
    }),
  });

  return res.ok;
}
