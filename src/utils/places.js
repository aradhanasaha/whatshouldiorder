import { calculateDistance } from './scoring.js';

const MOCK_RESTAURANTS = [
  {
    id: 'mock_1',
    displayName: { text: 'The Bowl Company' },
    rating: 4.4,
    location: { latitude: 12.9741, longitude: 77.5979 },
    formattedAddress: 'Indiranagar, Bangalore',
    menu: [
      { name: 'Grilled Chicken Salad', description: 'Grilled chicken breast, romaine lettuce, cherry tomatoes, olive oil dressing', price: 320 },
      { name: 'Quinoa Power Bowl', description: 'Protein quinoa with roasted vegetables, chickpeas, tahini', price: 380 },
      { name: 'Avocado Toast', description: 'Sourdough with smashed avocado, poached egg, microgreens', price: 280 },
      { name: 'Protein Shake', description: 'Whey protein with banana, almond milk, peanut butter', price: 220 },
      { name: 'Greek Salad', description: 'Cucumber, tomato, olives, feta cheese with herb dressing', price: 280 },
      { name: 'Smoothie Bowl', description: 'Blended acai and mixed berries with granola and fresh fruit', price: 320 },
    ],
  },
  {
    id: 'mock_2',
    displayName: { text: 'Punjab Grill' },
    rating: 4.1,
    location: { latitude: 12.9698, longitude: 77.5921 },
    formattedAddress: 'Koramangala, Bangalore',
    menu: [
      { name: 'Dal Makhani', description: 'Creamy black lentils slow-cooked with butter and cream', price: 220 },
      { name: 'Butter Chicken', description: 'Tender chicken in rich tomato-butter cream gravy', price: 280 },
      { name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled in tandoor', price: 250 },
      { name: 'Aloo Paratha', description: 'Stuffed potato flatbread with curd and pickle', price: 120 },
      { name: 'Rajma Chawal', description: 'Kidney bean curry served with steamed rice', price: 180 },
      { name: 'Palak Paneer', description: 'Fresh spinach curry with cottage cheese cubes', price: 230 },
      { name: 'Chicken Biryani', description: 'Fragrant basmati rice cooked with spiced chicken', price: 300 },
      { name: 'Tandoori Roti', description: 'Whole wheat flatbread from clay oven', price: 40 },
    ],
  },
  {
    id: 'mock_3',
    displayName: { text: 'Dakshin' },
    rating: 4.2,
    location: { latitude: 12.9725, longitude: 77.5951 },
    formattedAddress: 'Koramangala, Bangalore',
    menu: [
      { name: 'Masala Dosa', description: 'Crispy fermented crepe with spiced potato filling and chutneys', price: 120 },
      { name: 'Idli Vada Combo', description: '3 steamed rice cakes with fried lentil donut and sambar', price: 100 },
      { name: 'Uttapam', description: 'Thick rice pancake with onions, tomatoes, green chillies', price: 110 },
      { name: 'Chettinad Chicken Curry', description: 'Spicy aromatic South Indian chicken curry', price: 280 },
      { name: 'Sambar Rice', description: 'Lentil vegetable soup with steamed rice', price: 150 },
      { name: 'Rava Dosa', description: 'Crispy semolina crepe with potato filling', price: 130 },
      { name: 'Pongal', description: 'Comforting rice and lentil porridge with ghee and cashews', price: 120 },
    ],
  },
  {
    id: 'mock_4',
    displayName: { text: 'China Garden' },
    rating: 3.9,
    location: { latitude: 12.9685, longitude: 77.5943 },
    formattedAddress: 'HSR Layout, Bangalore',
    menu: [
      { name: 'Chicken Hakka Noodles', description: 'Stir-fried egg noodles with chicken and vegetables', price: 200 },
      { name: 'Chicken Fried Rice', description: 'Wok-tossed rice with chicken, egg, and vegetables', price: 200 },
      { name: 'Chilli Chicken', description: 'Crispy chicken in spicy Indo-Chinese sauce', price: 250 },
      { name: 'Gobi Manchurian', description: 'Crispy cauliflower in tangy Manchurian gravy', price: 180 },
      { name: 'Veg Hakka Noodles', description: 'Stir-fried noodles with mixed vegetables', price: 170 },
      { name: 'Schezwan Fried Rice', description: 'Spicy wok-tossed rice with Schezwan sauce', price: 190 },
      { name: 'Manchow Soup', description: 'Hot and sour vegetable soup with crispy noodles', price: 140 },
    ],
  },
  {
    id: 'mock_5',
    displayName: { text: 'Biryani Blues' },
    rating: 4.3,
    location: { latitude: 12.9712, longitude: 77.5908 },
    formattedAddress: 'Indiranagar, Bangalore',
    menu: [
      { name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken and whole spices', price: 300 },
      { name: 'Mutton Biryani', description: 'Slow-cooked tender mutton with fragrant basmati rice', price: 380 },
      { name: 'Veg Biryani', description: 'Seasonal vegetables cooked with basmati rice and saffron', price: 220 },
      { name: 'Hyderabadi Dum Biryani', description: 'Authentic dum-cooked Hyderabadi style biryani', price: 340 },
      { name: 'Egg Biryani', description: 'Fragrant biryani with masala-coated boiled eggs', price: 250 },
      { name: 'Chicken Tikka', description: 'Marinated chicken grilled in tandoor', price: 280 },
    ],
  },
  {
    id: 'mock_6',
    displayName: { text: 'Burger Singh' },
    rating: 4.0,
    location: { latitude: 12.9667, longitude: 77.5932 },
    formattedAddress: 'Koramangala, Bangalore',
    menu: [
      { name: 'Chicken Burger', description: 'Crispy chicken patty with lettuce, tomato, chipotle mayo', price: 180 },
      { name: 'Veg Burger', description: 'Aloo tikki patty with veggies and tangy sauce', price: 130 },
      { name: 'Chicken Wrap', description: 'Grilled chicken with veggies in flour tortilla', price: 200 },
      { name: 'Club Sandwich', description: 'Triple-decker chicken sandwich with egg and veggies', price: 220 },
      { name: 'French Fries', description: 'Classic golden crispy fries with seasoning', price: 100 },
    ],
  },
  {
    id: 'mock_7',
    displayName: { text: 'Momo Magic' },
    rating: 4.1,
    location: { latitude: 12.9754, longitude: 77.5965 },
    formattedAddress: 'Indiranagar, Bangalore',
    menu: [
      { name: 'Chicken Momo', description: 'Juicy steamed dumplings with spiced minced chicken', price: 160 },
      { name: 'Veg Momo', description: 'Steamed dumplings with spiced mixed vegetables', price: 130 },
      { name: 'Pan Fried Momo', description: 'Crispy pan-fried dumplings with chicken filling', price: 180 },
      { name: 'Jhol Momo', description: 'Steamed momos in spicy sesame-tomato sauce', price: 200 },
      { name: 'Chicken Fried Rice', description: 'Wok-tossed rice with chicken and egg', price: 170 },
    ],
  },
  {
    id: 'mock_8',
    displayName: { text: 'Spice Route' },
    rating: 3.8,
    location: { latitude: 12.9732, longitude: 77.5972 },
    formattedAddress: 'Indiranagar, Bangalore',
    menu: [
      { name: 'Seekh Kebab', description: 'Minced meat kebabs grilled on skewers with spices', price: 280 },
      { name: 'Tandoori Chicken', description: 'Whole chicken marinated and cooked in clay oven', price: 350 },
      { name: 'Malai Tikka', description: 'Creamy marinated chicken pieces grilled in tandoor', price: 300 },
      { name: 'Paneer Butter Masala', description: 'Cottage cheese in rich tomato-butter gravy', price: 250 },
      { name: 'Dal Tadka', description: 'Yellow lentils tempered with cumin and garlic', price: 180 },
      { name: 'Garlic Naan', description: 'Leavened garlic bread baked in tandoor', price: 60 },
      { name: 'Chicken Tikka Masala', description: 'Grilled chicken in spiced tomato cream sauce', price: 310 },
    ],
  },
];

function withDistances(restaurants, lat, lng) {
  return restaurants.map((restaurant) => ({
    ...restaurant,
    distance: calculateDistance(lat, lng, restaurant.location.latitude, restaurant.location.longitude),
  }));
}

async function searchNearby(lat, lng, apiKey, radius, maxResultCount) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.rating,places.priceLevel,places.formattedAddress,places.location,places.types',
      'X-Goog-Api-Key': apiKey,
    },
    body: JSON.stringify({
      includedTypes: ['restaurant', 'meal_delivery', 'meal_takeaway'],
      maxResultCount,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Places API ${res.status}: ${body.slice(0, 120)}`);
  }

  const data = await res.json();
  return data.places || [];
}

async function getPlaceDetails(placeId, apiKey) {
  const cached = sessionStorage.getItem(`place_${placeId}`);

  if (cached) {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < 30 * 60 * 1000) return data;
  }

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-FieldMask': 'displayName,businessMenus',
      'X-Goog-Api-Key': apiKey,
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  sessionStorage.setItem(`place_${placeId}`, JSON.stringify({ data, ts: Date.now() }));
  return data;
}

function extractMenuFromDetails(details) {
  if (!details?.businessMenus?.length) return [];

  const items = [];

  for (const menu of details.businessMenus) {
    for (const section of menu.sections || []) {
      for (const item of section.items || []) {
        if (!item.name) continue;

        const entry = {
          name: item.name,
          description: item.description || '',
          price: item.price ? parseInt(item.price.units || 0, 10) : 0,
        };

        const nutrition = item.attributes?.nutritionFacts;
        if (nutrition?.calories) {
          entry.kcal = Math.round((nutrition.calories.lowerAmount + nutrition.calories.upperAmount) / 2);
          entry.protein = nutrition.protein
            ? Math.round((nutrition.protein.lowerAmount + nutrition.protein.upperAmount) / 2)
            : null;
          entry.source = 'Google Menu';
        }

        items.push(entry);
      }
    }
  }

  return items;
}

function normalizePlace(place, lat, lng) {
  return {
    id: place.id,
    displayName: place.displayName,
    rating: place.rating || null,
    priceLevel: place.priceLevel || null,
    formattedAddress: place.formattedAddress || '',
    location: place.location,
    distance: calculateDistance(lat, lng, place.location?.latitude, place.location?.longitude),
  };
}

function dedupePlaces(places) {
  const seen = new Map();

  for (const place of places) {
    if (!place?.id) continue;
    if (!seen.has(place.id)) seen.set(place.id, place);
  }

  return [...seen.values()];
}

export async function fetchRestaurantCandidates(lat, lng, apiKey) {
  if (!apiKey) {
    return withDistances(MOCK_RESTAURANTS, lat, lng).map((restaurant) => ({
      id: restaurant.id,
      displayName: restaurant.displayName,
      rating: restaurant.rating || null,
      priceLevel: null,
      formattedAddress: restaurant.formattedAddress || '',
      location: restaurant.location,
      distance: restaurant.distance,
      seedMenu: restaurant.menu || [],
    }));
  }

  const [nearby, extended] = await Promise.all([
    searchNearby(lat, lng, apiKey, 2000, 10),
    searchNearby(lat, lng, apiKey, 5000, 20),
  ]);

  return dedupePlaces([...nearby, ...extended])
    .map((place) => normalizePlace(place, lat, lng))
    .sort((a, b) => (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER));
}

export async function testGoogleKey(apiKey) {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.id',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        maxResultCount: 1,
        locationRestriction: {
          circle: { center: { latitude: 12.9716, longitude: 77.5946 }, radius: 500 },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { extractMenuFromDetails, getPlaceDetails, MOCK_RESTAURANTS, withDistances };
