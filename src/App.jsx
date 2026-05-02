import { useCallback, useEffect, useRef, useState } from 'react';
import InputScreen from './components/InputScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { estimateMacros, findRestaurantFallbackDishes } from './utils/openai.js';
import { extractMenuFromDetails, fetchRestaurantCandidates, getPlaceDetails } from './utils/places.js';
import { matchScore } from './utils/scoring.js';
import { lookupDish } from '../food-db.js';

function isVeg(name) {
  const nonVeg = ['chicken', 'mutton', 'fish', 'prawn', 'egg', 'meat', 'lamb', 'beef', 'pork', 'keema', 'mince', 'chettinad', 'seekh'];
  return !nonVeg.some((keyword) => name.toLowerCase().includes(keyword));
}

function fallbackMacros(name) {
  const value = name.toLowerCase();

  if (value.includes('chicken') || value.includes('mutton') || value.includes('fish') || value.includes('seekh') || value.includes('prawn')) {
    return { kcal: 340, protein: 30, carbs: 12, fat: 18 };
  }
  if (value.includes('paneer') || value.includes('tofu')) return { kcal: 360, protein: 18, carbs: 14, fat: 24 };
  if (value.includes('egg') || value.includes('omelette')) return { kcal: 220, protein: 16, carbs: 8, fat: 14 };
  if (value.includes('biryani')) return { kcal: 520, protein: 22, carbs: 70, fat: 16 };
  if (value.includes('rice') || value.includes('pulao')) return { kcal: 380, protein: 8, carbs: 72, fat: 6 };
  if (value.includes('naan') || value.includes('roti') || value.includes('paratha')) return { kcal: 290, protein: 8, carbs: 46, fat: 9 };
  if (value.includes('salad') || value.includes('bowl') || value.includes('quinoa')) return { kcal: 320, protein: 20, carbs: 30, fat: 14 };
  if (value.includes('dosa') || value.includes('idli') || value.includes('uttapam')) return { kcal: 250, protein: 6, carbs: 45, fat: 6 };
  if (value.includes('momo') || value.includes('dumpling')) return { kcal: 280, protein: 14, carbs: 36, fat: 8 };
  if (value.includes('burger') || value.includes('sandwich') || value.includes('wrap')) return { kcal: 400, protein: 20, carbs: 44, fat: 16 };
  if (value.includes('soup')) return { kcal: 120, protein: 6, carbs: 16, fat: 4 };
  return { kcal: 380, protein: 14, carbs: 48, fat: 12 };
}

function sortRestaurants(restaurants) {
  const statusRank = (restaurant) => {
    if (restaurant.hasMenu) return 0;
    if (restaurant.menuStatus === 'Scanning...') return 1;
    return 2;
  };

  return [...restaurants].sort((a, b) => {
    const rankDiff = statusRank(a) - statusRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
  });
}

function scoreDish(dish, goals) {
  const mealTarget = {
    kcal: goals.perMeal.kcal,
    protein: goals.perMeal.protein,
    budget: goals.budget,
  };

  const safeDish = {
    ...dish,
    protein: dish.protein ?? 0,
    carbs: dish.carbs ?? 0,
    fat: dish.fat ?? 0,
    price: dish.price ?? 0,
  };

  const score = matchScore(safeDish, mealTarget);
  return score >= 40 ? { ...safeDish, score } : null;
}

function buildRestaurantRecord(candidate) {
  return {
    id: candidate.id,
    name: candidate.displayName?.text || candidate.name || 'Restaurant',
    rating: candidate.rating ?? null,
    distance: candidate.distance ?? null,
    priceLevel: candidate.priceLevel ?? null,
    address: candidate.formattedAddress || candidate.address || '',
    menuStatus: candidate.seedMenu ? 'Menu Available' : 'Scanning...',
    fallbackStatus: 'idle',
    hasMenu: Boolean(candidate.seedMenu?.length),
    dishes: [],
    seedMenu: candidate.seedMenu || [],
  };
}

function getPlacesWarningMessage(error) {
  const message = error?.message || '';

  if (message.includes('Places API 403')) {
    return 'Google Places access is not enabled for this build right now, so the app has switched to demo restaurants.';
  }

  if (message.includes('Places API 401')) {
    return 'The Google Places key looks invalid for this build, so the app has switched to demo restaurants.';
  }

  return `Places lookup failed (${message.split(':')[0] || 'unknown error'}) - showing demo restaurants instead.`;
}

export default function App() {
  const [status, setStatus] = useState('idle');
  const [goals, setGoals] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [apiWarning, setApiWarning] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDemoNote, setShowDemoNote] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const searchRunRef = useRef(0);

  useEffect(() => {
    const nextDishes = restaurants
      .flatMap((restaurant) => restaurant.dishes)
      .sort((a, b) => b.score - a.score);

    setDishes(nextDishes);
  }, [restaurants]);

  const apiKeys = () => ({
    googleKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY || localStorage.getItem('wsio_google_key') || '',
    openaiKey: import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('wsio_openai_key') || '',
  });

  const patchRestaurant = useCallback((restaurantId, updater) => {
    setRestaurants((current) =>
      sortRestaurants(
        current.map((restaurant) => (restaurant.id === restaurantId ? updater(restaurant) : restaurant))
      )
    );
  }, []);

  const resolveMenuDishes = useCallback(async (menuItems, restaurant, currentGoals, openaiKey) => {
    const ready = [];
    const needsAi = [];

    for (const item of menuItems) {
      if (currentGoals.diet === 'veg' && !isVeg(item.name)) continue;
      if (currentGoals.diet === 'non-veg' && isVeg(item.name)) continue;

      const baseDish = {
        name: item.name,
        description: item.description || '',
        price: item.price || 0,
        restaurantId: restaurant.id,
        restaurant: {
          name: restaurant.name,
          rating: restaurant.rating,
          distance: restaurant.distance,
          address: restaurant.address,
        },
      };

      if (item.kcal != null) {
        const scored = scoreDish(
          {
            ...baseDish,
            kcal: item.kcal,
            protein: item.protein ?? 0,
            carbs: item.carbs ?? 0,
            fat: item.fat ?? 0,
            source: item.source || 'Google Menu',
          },
          currentGoals
        );
        if (scored) ready.push(scored);
        continue;
      }

      const dbMatch = lookupDish(item.name);
      if (dbMatch) {
        const scored = scoreDish(
          {
            ...baseDish,
            kcal: dbMatch.kcal,
            protein: dbMatch.protein,
            carbs: dbMatch.carbs,
            fat: dbMatch.fat,
            source: 'Food DB',
          },
          currentGoals
        );
        if (scored) ready.push(scored);
      } else {
        needsAi.push({ item, baseDish });
      }
    }

    if (!needsAi.length) return ready;

    if (openaiKey) {
      try {
        const estimated = await estimateMacros(
          needsAi.map(({ item }) => ({ name: item.name, description: item.description || '' })),
          openaiKey
        );
        const estimatedMap = new Map(estimated.map((entry) => [entry.name.toLowerCase(), entry]));

        for (const { item, baseDish } of needsAi) {
          const match = estimatedMap.get(item.name.toLowerCase());
          const scored = scoreDish(
            match
              ? {
                  ...baseDish,
                  kcal: match.kcal,
                  protein: match.protein_g,
                  carbs: match.carbs_g,
                  fat: match.fat_g,
                  source: 'AI Estimated',
                }
              : {
                  ...baseDish,
                  ...fallbackMacros(item.name),
                  source: 'AI Estimated',
                },
            currentGoals
          );
          if (scored) ready.push(scored);
        }

        return ready;
      } catch {
        // Fall through to local heuristic estimates.
      }
    }

    for (const { item, baseDish } of needsAi) {
      const scored = scoreDish(
        {
          ...baseDish,
          ...fallbackMacros(item.name),
          source: 'AI Estimated',
        },
        currentGoals
      );
      if (scored) ready.push(scored);
    }

    return ready;
  }, []);

  const runRestaurantFallback = useCallback(
    async (restaurant, currentGoals, openaiKey, locationText, runId) => {
      if (!openaiKey) {
        patchRestaurant(restaurant.id, (current) => ({ ...current, fallbackStatus: 'unavailable' }));
        return;
      }

      patchRestaurant(restaurant.id, (current) => ({ ...current, fallbackStatus: 'loading' }));

      try {
        const dishesFromFallback = await findRestaurantFallbackDishes(
          {
            restaurantName: restaurant.name,
            locationText,
            mealTarget: {
              kcal: currentGoals.perMeal.kcal,
              protein: currentGoals.perMeal.protein,
              budget: currentGoals.budget,
            },
            diet: currentGoals.diet,
          },
          openaiKey
        );

        if (searchRunRef.current !== runId) return;

        const normalized = dishesFromFallback
          .map((dish) =>
            scoreDish(
              {
                name: dish.name,
                description: dish.description || '',
                price: dish.price || 0,
                kcal: dish.kcal,
                protein: dish.protein,
                carbs: dish.carbs,
                fat: dish.fat,
                source: 'Web Search',
                fallbackDisclaimer: true,
                restaurantId: restaurant.id,
                restaurant: {
                  name: restaurant.name,
                  rating: restaurant.rating,
                  distance: restaurant.distance,
                  address: restaurant.address,
                },
              },
              currentGoals
            )
          )
          .filter(Boolean);

        patchRestaurant(restaurant.id, (current) => ({
          ...current,
          fallbackStatus: normalized.length ? 'done' : 'empty',
          dishes: normalized.length ? normalized : current.dishes,
        }));
      } catch {
        if (searchRunRef.current !== runId) return;
        patchRestaurant(restaurant.id, (current) => ({ ...current, fallbackStatus: 'failed' }));
      }
    },
    [patchRestaurant]
  );

  const handleSearch = useCallback(
    async (nextGoals) => {
      const runId = Date.now();
      searchRunRef.current = runId;

      setGoals(nextGoals);
      setStatus('loading');
      setRestaurants([]);
      setDishes([]);
      setSelectedRestaurantId(null);
      setMobileSidebarOpen(false);
      setLoadingPhase('Finding restaurants near you...');
      setApiWarning('');

      const { googleKey, openaiKey } = apiKeys();
      setIsDemoMode(!googleKey);

      let lat = nextGoals.location.lat ?? 12.9716;
      let lng = nextGoals.location.lng ?? 77.5946;

      try {
        if (nextGoals.location.type === 'text' && googleKey) {
          setLoadingPhase('Geocoding your location...');
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(nextGoals.location.text)}&key=${googleKey}`
            );
            const data = await response.json();
            if (data.results?.[0]) {
              lat = data.results[0].geometry.location.lat;
              lng = data.results[0].geometry.location.lng;
            }
          } catch {
            // Keep the default coordinates if geocoding fails.
          }
        }

        setLoadingPhase('Finding restaurants near you...');
        let candidates;

        try {
          candidates = await fetchRestaurantCandidates(lat, lng, googleKey);
        } catch (error) {
          setIsDemoMode(true);
          setApiWarning(getPlacesWarningMessage(error));
          candidates = await fetchRestaurantCandidates(lat, lng, '');
        }

        if (searchRunRef.current !== runId) return;

        const initialRestaurants = candidates.map(buildRestaurantRecord);
        setRestaurants(sortRestaurants(initialRestaurants));
        setLoadingPhase('Nearby restaurants are loading...');

        const tasks = initialRestaurants.map(async (restaurant, index) => {
          const candidate = candidates[index];
          const menuItems = candidate.seedMenu?.length
            ? candidate.seedMenu
            : extractMenuFromDetails(await getPlaceDetails(candidate.id, googleKey));

          if (searchRunRef.current !== runId) return;

          if (menuItems.length) {
            patchRestaurant(restaurant.id, (current) => ({
              ...current,
              hasMenu: true,
              menuStatus: 'Menu Available',
              fallbackStatus: 'idle',
            }));

            setLoadingPhase('Menus and macros are resolving...');
            const resolvedDishes = await resolveMenuDishes(menuItems, restaurant, nextGoals, openaiKey);

            if (searchRunRef.current !== runId) return;

            patchRestaurant(restaurant.id, (current) => ({
              ...current,
              dishes: resolvedDishes,
            }));
            return;
          }

          patchRestaurant(restaurant.id, (current) => ({
            ...current,
            hasMenu: false,
            menuStatus: 'No Menu - Web Search',
          }));

          setLoadingPhase('Web fallback is trickling in for restaurants without menus...');
          await runRestaurantFallback(
            restaurant,
            nextGoals,
            openaiKey,
            nextGoals.location.text || nextGoals.location.address || 'Bangalore',
            runId
          );
        });

        await Promise.allSettled(tasks);

        if (searchRunRef.current !== runId) return;

        setLoadingPhase(dishes.length ? 'Results are ready.' : 'Search complete.');
        setStatus('done');
      } catch (error) {
        console.error('Search failed:', error);
        if (searchRunRef.current !== runId) return;

        setApiWarning('Something went wrong while searching. You can adjust your goals and retry.');
        setStatus('done');
      }
    },
    [dishes.length, patchRestaurant, resolveMenuDishes, runRestaurantFallback]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside
        className={`
          ${mobileSidebarOpen ? 'flex' : 'hidden'} md:flex
          w-full md:w-[340px] xl:w-[380px] flex-shrink-0
          flex-col overflow-y-auto bg-[#0c0c11]
        `}
      >
        <InputScreen
          onSearch={handleSearch}
          onSettings={() => setShowSettings(true)}
          searching={status === 'loading'}
        />
      </aside>

      <main className={`${!mobileSidebarOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-y-auto relative`}>
        <div className="absolute right-3 top-3 z-20">
          <button
            onClick={() => setShowDemoNote((current) => !current)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="About this demo"
            title="About this demo"
          >
            i
          </button>

          {showDemoNote ? (
            <div className="mt-2 w-[280px] rounded-2xl border border-sky-100 bg-white p-4 text-left shadow-xl shadow-sky-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Demo Note</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Hey Swiggy team, this is the current demo. Coverage from Google Maps APIs and my own food database is still
                fairly shallow, and that gap is exactly where Swiggy MCP tools would make this much stronger with deeper
                restaurant, menu, and ordering coverage.
              </p>
            </div>
          ) : null}
        </div>

        {(apiWarning || isDemoMode) && status !== 'idle' && (
          <div
            className={`shrink-0 border-b px-4 py-2 text-center text-xs ${
              apiWarning
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-blue-100 bg-blue-50 text-blue-600'
            }`}
          >
            {apiWarning || 'Demo Mode - using simulated restaurants because no Google Places key is configured.'}
          </div>
        )}

        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="absolute left-3 top-3 z-10 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm hover:bg-gray-50 md:hidden"
        >
          Back to goals
        </button>

        {status === 'idle' ? (
          <EmptyState />
        ) : (
          <ResultsScreen
            dishes={dishes}
            goals={goals}
            restaurants={restaurants}
            selectedRestaurantId={selectedRestaurantId}
            onSelectRestaurant={(restaurantId) =>
              setSelectedRestaurantId((current) => (current === restaurantId ? null : restaurantId))
            }
            loadingPhase={loadingPhase}
            isLoading={status === 'loading'}
          />
        )}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 select-none text-8xl">🍽️</div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-800">What should you order?</h2>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-gray-400">
        Set your calorie and macro goals in the sidebar to discover dishes from nearby restaurants that actually fit your targets.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {['Veg filter', 'Macro-matched', 'Budget-aware', 'Location-based', 'AI nutrition'].map((feature) => (
          <span key={feature} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm">
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}
