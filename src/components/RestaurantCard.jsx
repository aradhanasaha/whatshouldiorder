function cuisineEmoji(cuisines = []) {
  const joined = cuisines.join(' ').toLowerCase();
  if (joined.includes('chinese') || joined.includes('asian') || joined.includes('thai')) return '🥡';
  if (joined.includes('momo') || joined.includes('tibetan')) return '🥟';
  if (joined.includes('biryani')) return '🍚';
  if (joined.includes('pizza') || joined.includes('italian')) return '🍕';
  if (joined.includes('burger') || joined.includes('fast')) return '🍔';
  if (joined.includes('south indian')) return '🥞';
  if (joined.includes('dessert') || joined.includes('sweet')) return '🍰';
  if (joined.includes('kebab') || joined.includes('tandoor') || joined.includes('mughlai')) return '🍢';
  return '🍽️';
}

export default function RestaurantCard({ restaurant }) {
  const {
    name, cuisines, rating, totalRatings, costForTwoLabel, areaName,
    distanceKm, deliveryTimeMinutes, offer, imageUrl, availabilityStatus, swiggyUrl,
  } = restaurant;

  const closed = availabilityStatus && availabilityStatus !== 'OPEN';

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-36 w-full overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">{cuisineEmoji(cuisines)}</div>
        )}
        {offer ? (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {offer}
          </span>
        ) : null}
        {closed ? (
          <span className="absolute right-2 top-2 rounded-md bg-red-600/90 px-2 py-1 text-[11px] font-bold text-white">
            {availabilityStatus}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold leading-tight text-gray-900">{name}</h3>
          {rating != null ? (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-bold text-white">
              {rating}★
            </span>
          ) : null}
        </div>

        <p className="mt-1 truncate text-xs text-gray-400">{cuisines.slice(0, 3).join(', ')}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          {deliveryTimeMinutes != null ? <span>{deliveryTimeMinutes} min</span> : null}
          {distanceKm != null ? <span>· {distanceKm} km</span> : null}
          {areaName ? <span>· {areaName}</span> : null}
          {totalRatings ? <span>· {totalRatings} ratings</span> : null}
        </div>

        {costForTwoLabel ? (
          <p className="mt-2 text-xs font-semibold text-gray-600">{costForTwoLabel}</p>
        ) : null}

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
