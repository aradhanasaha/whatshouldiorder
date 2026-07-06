import { scoreBadge } from '../utils/scoring.js';

function VegDot({ isVeg }) {
  if (isVeg == null) return null;
  const color = isVeg ? 'border-green-600' : 'border-red-600';
  const dot = isVeg ? 'bg-green-600' : 'bg-red-600';
  return (
    <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${color}`} title={isVeg ? 'Veg' : 'Non-veg'}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
    </span>
  );
}

export default function DishCard({ dish }) {
  const { name, price, isVeg, restaurantName, rating, distanceKm, imageUrl, score, reason, swiggyUrl } = dish;
  const badge = scoreBadge(score);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      {imageUrl ? (
        <div className="h-32 w-full overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <VegDot isVeg={isVeg} />
            <h3 className="truncate text-sm font-bold leading-tight text-gray-900">{name}</h3>
          </div>
          {price != null ? <span className="shrink-0 text-sm font-black text-orange-500">₹{price}</span> : null}
        </div>

        <p className="truncate text-xs text-gray-400">
          {restaurantName}
          {rating != null ? <span className="font-medium text-yellow-500"> · {rating}★</span> : null}
          {distanceKm != null ? <span> · {distanceKm} km</span> : null}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}>
            {badge.emoji} {score}
          </span>
          {reason ? <span className="text-[11px] font-medium text-gray-500">{reason}</span> : null}
        </div>

        <a
          href={swiggyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-center text-xs font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-orange-400 hover:to-amber-400 hover:shadow-orange-300"
        >
          Order on Swiggy ↗
        </a>
      </div>
    </div>
  );
}
