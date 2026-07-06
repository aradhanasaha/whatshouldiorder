import { useState } from 'react';
import DishCard from './DishCard.jsx';

const SORTS = [
  { key: 'match', label: 'Best match' },
  { key: 'rating', label: 'Rating' },
  { key: 'distance', label: 'Distance' },
  { key: 'price', label: 'Price' },
];

function sortDishes(dishes, sort) {
  const list = [...dishes];
  switch (sort) {
    case 'rating':
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'distance':
      return list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    case 'price':
      return list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'match':
    default:
      return list; // server already returns ranked by score
  }
}

export default function ResultsScreen({ dishes, orderAgain, query, loadingPhase, isLoading, mode, onReorder }) {
  const [sort, setSort] = useState('match');
  const sorted = sortDishes(dishes, sort);
  const isLive = mode === 'shared-local';

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-gray-900">
              {dishes.length} dishes
              {query ? <span className="ml-2 text-sm font-medium text-gray-400">for “{query}”</span> : null}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isLive ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}
            >
              {isLive ? '● Live Swiggy' : '● Sample data'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {loadingPhase || 'Ranked by rating, distance, and your order history.'}
          </p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                sort === s.key ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {orderAgain?.length ? (
        <div className="shrink-0 border-b border-gray-100 bg-orange-50/40 px-5 py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-600">Order again</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {orderAgain.map((d, i) => (
              <button
                key={`${d.name}-${i}`}
                onClick={() => onReorder?.(d.name)}
                className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-left text-xs shadow-sm transition-colors hover:bg-orange-50"
                title={d.restaurantName ? `from ${d.restaurantName}` : ''}
              >
                <span className="font-semibold text-gray-800">{d.name}</span>
                {d.restaurantName ? <span className="ml-1 text-gray-400">· {d.restaurantName}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && sorted.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 text-5xl">🫙</div>
            <p className="mb-1 font-bold text-gray-700">No dishes matched</p>
            <p className="max-w-xs text-sm text-gray-400">
              Try a different craving, raise your budget, switch the veg filter, or pick another address.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="h-32 w-full animate-pulse bg-gray-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
        <div className="h-8 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}
