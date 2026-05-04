import { URL } from 'url';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Fetch ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function extractMenuFromDetails(details) {
  if (!details?.businessMenus?.length) return [];

  const items = [];

  for (const menu of details.businessMenus) {
    for (const section of menu.sections || []) {
      for (const item of section.items || []) {
        if (!item?.name) continue;

        const entry = {
          name: item.name,
          description: item.description || '',
          price: item.price ? parseInt(item.price.units || 0, 10) : null,
          source: 'Places Menu',
        };

        const nutrition = item.attributes?.nutritionFacts;
        if (nutrition?.calories) {
          entry.kcal = Math.round((nutrition.calories.lowerAmount + nutrition.calories.upperAmount) / 2);
        }

        if (nutrition?.protein) {
          entry.protein = Math.round((nutrition.protein.lowerAmount + nutrition.protein.upperAmount) / 2);
        }

        items.push(entry);
      }
    }
  }

  return items;
}

async function searchText(query, apiKey, maxResultCount = 20) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const res = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.types,places.rating,places.priceLevel',
    },
    body: JSON.stringify({ query, includedTypes: ['restaurant', 'meal_delivery', 'meal_takeaway'], maxResultCount }),
  });

  return res.places || [];
}

async function searchNearby(lat, lng, apiKey, radius = 5000, maxResultCount = 20) {
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const res = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.types,places.rating,places.priceLevel',
    },
    body: JSON.stringify({
      includedTypes: ['restaurant', 'meal_delivery', 'meal_takeaway'],
      maxResultCount,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
  });

  return res.places || [];
}

async function getPlaceDetails(placeId, apiKey) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  try {
    const res = await fetchJson(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,businessMenus,location,formattedAddress',
      },
    });
    return res;
  } catch (err) {
    return null;
  }
}

function dedupePlaces(places) {
  const seen = new Map();
  for (const p of places) {
    if (!p?.id) continue;
    if (!seen.has(p.id)) seen.set(p.id, p);
  }
  return [...seen.values()];
}

export async function restaurantFallbackViaPlaces(payload = {}, env = {}) {
  const apiKey = env.VITE_GOOGLE_PLACES_API_KEY || payload.googleApiKey || '';
  if (!apiKey) return { dishes: [] };

  const dishes = [];
  const triedPlaceIds = new Set();

  // First try a text search combining restaurant name + location hint
  if (payload.restaurantName) {
    const query = `${payload.restaurantName} ${payload.locationText || ''}`.trim();
    try {
      const results = await searchText(query, apiKey, 20);
      for (const place of dedupePlaces(results)) {
        if (!place.id || triedPlaceIds.has(place.id)) continue;
        triedPlaceIds.add(place.id);
        const details = await getPlaceDetails(place.id, apiKey);
        const items = extractMenuFromDetails(details || {});
        if (items.length) {
          for (const it of items.slice(0, 5)) {
            dishes.push({
              name: it.name,
              description: it.description || '',
              price: it.price || null,
              kcal: it.kcal ?? null,
              protein: it.protein ?? null,
              source: 'Places Menu',
              placeId: place.id,
              placeName: place.displayName || details?.displayName || '',
              placeAddress: place.formattedAddress || details?.formattedAddress || '',
            });
          }
        }
        if (dishes.length >= 3) return { dishes: dishes.slice(0, 3) };
      }
    } catch (err) {
      // swallow and continue to nearby expansion
    }
  }

  // If no menus found via text, try nearby expansion if coords provided
  if (payload.locationCoords && payload.locationCoords.latitude && payload.locationCoords.longitude) {
    const lat = payload.locationCoords.latitude;
    const lng = payload.locationCoords.longitude;
    const radii = [2000, 5000, 10000];
    for (const r of radii) {
      try {
        const res = await searchNearby(lat, lng, apiKey, r, 30);
        for (const place of dedupePlaces(res)) {
          if (!place.id || triedPlaceIds.has(place.id)) continue;
          triedPlaceIds.add(place.id);
          const details = await getPlaceDetails(place.id, apiKey);
          const items = extractMenuFromDetails(details || {});
          if (items.length) {
            for (const it of items.slice(0, 5)) {
              dishes.push({
                name: it.name,
                description: it.description || '',
                price: it.price || null,
                kcal: it.kcal ?? null,
                protein: it.protein ?? null,
                source: 'Places Menu',
                placeId: place.id,
                placeName: place.displayName || details?.displayName || '',
                placeAddress: place.formattedAddress || details?.formattedAddress || '',
              });
            }
          }
          if (dishes.length >= 3) return { dishes: dishes.slice(0, 3) };
        }
      } catch (err) {
        // continue to next radius
      }
    }
  }

  return { dishes: dishes.slice(0, 3) };
}

export default null;
