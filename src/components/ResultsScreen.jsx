import { useState } from 'react';
import DishCard from './DishCard.jsx';

const SORTS = [
  { key: 'score', label: 'Best Match' },
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein' },
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' },
];

const PRICE_LEVEL_LABELS = {
  PRICE_LEVEL_INEXPENSIVE: '₹',
  PRICE_LEVEL_MODERATE: '₹₹',
  PRICE_LEVEL_EXPENSIVE: '₹₹₹',
  PRICE_LEVEL_VERY_EXPENSIVE: '₹₹₹₹',
};

export default function ResultsScreen({
  dishes,
  goals,
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  loadingPhase,
  isLoading,
}) {
  const [sort, setSort] = useState('score');

  const sortedDishes = [...dishes].sort((a, b) => {
    if (sort === 'score') return b.score - a.score;
    if (sort === 'calories') return a.kcal - b.kcal;
    if (sort === 'protein') return b.protein - a.protein;
    if (sort === 'price') return a.price - b.price;
    if (sort === 'rating') return (b.restaurant.rating || 0) - (a.restaurant.rating || 0);
    return 0;
  });

  const visibleDishes = selectedRestaurantId
    ? sortedDishes.filter((dish) => dish.restaurantId === selectedRestaurantId)
    : sortedDishes;

  const mealTarget = goals ? { kcal: goals.perMeal.kcal, protein: goals.perMeal.protein } : null;
  const restaurantCount = restaurants.length;

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {visibleDishes.length} dishes
              <span className="ml-2 text-sm font-medium text-gray-400">across {restaurantCount} restaurants</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {loadingPhase || 'Browse restaurants on the right and dishes on the left.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {mealTarget && (
              <>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 font-semibold text-orange-600">
                  {mealTarget.kcal} kcal
                </span>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 font-semibold text-blue-600">
                  {mealTarget.protein}g protein
                </span>
              </>
            )}
            {selectedRestaurantId && (
              <button
                onClick={() => onSelectRestaurant(selectedRestaurantId)}
                className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 font-semibold text-gray-600 hover:bg-gray-200"
              >
                Clear restaurant filter
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {SORTS.map((sortOption) => (
            <button
              key={sortOption.key}
              onClick={() => setSort(sortOption.key)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                sort === sortOption.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {sortOption.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <section className="min-h-0 overflow-y-auto border-b border-gray-100 xl:border-b-0 xl:border-r">
          {visibleDishes.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 text-5xl">{isLoading ? '⏳' : '🫙'}</div>
              <p className="mb-1 font-bold text-gray-700">
                {isLoading ? 'Dishes are still loading' : 'No matching dishes found'}
              </p>
              <p className="max-w-xs text-sm text-gray-400">
                {isLoading
                  ? 'Restaurants should appear first. Matching dishes will fill in as menus, estimates, and web fallback results resolve.'
                  : 'Try increasing your calorie or budget target, or select a different restaurant.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
              {visibleDishes.map((dish, index) => (
                <DishCard
                  key={`${dish.restaurantId}-${dish.name}-${index}`}
                  dish={dish}
                  mealTarget={mealTarget}
                  isHighlighted={!selectedRestaurantId || dish.restaurantId === selectedRestaurantId}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="min-h-0 overflow-y-auto bg-[#f8fafc]">
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-[#f8fafc]/95 px-4 py-4 backdrop-blur-sm">
            <div className="text-sm font-bold text-gray-900">Restaurants</div>
            <p className="mt-1 text-xs text-gray-500">
              Every nearby restaurant stays visible even if menu data is still resolving.
            </p>
          </div>

          <div className="space-y-3 p-4">
            {restaurants.map((restaurant) => {
              const selected = restaurant.id === selectedRestaurantId;
              const badge = getStatusBadge(restaurant);

              return (
                <button
                  key={restaurant.id}
                  onClick={() => onSelectRestaurant(restaurant.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-orange-300 bg-white shadow-md shadow-orange-100'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900">{restaurant.name}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {restaurant.rating ? `${restaurant.rating}★` : 'Unrated'}
                        {restaurant.distance != null ? ` · ${restaurant.distance} km` : ''}
                        {restaurant.priceLevel ? ` · ${PRICE_LEVEL_LABELS[restaurant.priceLevel] || restaurant.priceLevel}` : ''}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    {restaurant.dishes.length
                      ? `${restaurant.dishes.length} matching dishes`
                      : restaurant.fallbackStatus === 'loading'
                        ? `Searching web for ${restaurant.name}...`
                        : 'No dishes yet'}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function getStatusBadge(restaurant) {
  if (restaurant.menuStatus === 'Scanning...') {
    return { label: 'Scanning...', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
  }

  if (restaurant.hasMenu) {
    return { label: 'Menu Available', className: 'bg-green-50 text-green-700 border border-green-200' };
  }

  if (restaurant.fallbackStatus === 'loading') {
    return { label: 'Searching web...', className: 'bg-blue-50 text-blue-700 border border-blue-200' };
  }

  return { label: 'No Menu - Web Search', className: 'bg-gray-100 text-gray-600 border border-gray-200' };
}
