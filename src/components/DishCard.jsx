import { scoreBadge } from '../utils/scoring.js';

function getDishEmoji(name) {
  const value = name.toLowerCase();
  if (value.includes('biryani')) return '🍚';
  if (value.includes('momo') || value.includes('dumpling')) return '🥟';
  if (value.includes('burger')) return '🍔';
  if (value.includes('pizza')) return '🍕';
  if (value.includes('noodle') || value.includes('hakka') || value.includes('schezwan')) return '🍜';
  if (value.includes('salad')) return '🥗';
  if (value.includes('dosa') || value.includes('uttapam') || value.includes('rava') || value.includes('idli')) return '🥞';
  if (value.includes('soup')) return '🍲';
  if (value.includes('sandwich') || value.includes('wrap') || value.includes('kathi') || value.includes('frankie')) return '🥪';
  if (value.includes('tikka') || value.includes('tandoori') || value.includes('chicken') || value.includes('malai')) return '🍗';
  if (value.includes('seekh') || value.includes('kebab') || value.includes('mutton') || value.includes('rogan')) return '🥩';
  if (value.includes('fish') || value.includes('prawn')) return '🐟';
  if (value.includes('egg') || value.includes('omelette') || value.includes('bhurji')) return '🥚';
  if (value.includes('paneer')) return '🧀';
  if (value.includes('dal') || value.includes('rajma') || value.includes('chole') || value.includes('chana')) return '🫘';
  if (value.includes('rice') || value.includes('pulao') || value.includes('khichdi')) return '🍚';
  if (value.includes('roti') || value.includes('naan') || value.includes('paratha') || value.includes('bhatura')) return '🥞';
  if (value.includes('bowl') || value.includes('quinoa') || value.includes('smoothie')) return '🥣';
  if (value.includes('shake') || value.includes('lassi') || value.includes('coffee')) return '🥤';
  return '🍽️';
}

const STRIP_COLORS = {
  green: 'from-green-400 to-emerald-500',
  yellow: 'from-yellow-400 to-amber-400',
  orange: 'from-orange-400 to-orange-500',
};

export default function DishCard({ dish, mealTarget, isHighlighted }) {
  const badge = scoreBadge(dish.score);
  const stripKey = badge.text === 'text-green-700' ? 'green' : badge.text === 'text-yellow-700' ? 'yellow' : 'orange';
  const swiggyUrl = `https://www.swiggy.com/search?query=${encodeURIComponent(dish.restaurant.name)}`;

  const calPct = mealTarget ? Math.min(100, Math.round((dish.kcal / mealTarget.kcal) * 100)) : 60;
  const protPct = mealTarget ? Math.min(100, Math.round((dish.protein / mealTarget.protein) * 100)) : 60;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-lg ${
        isHighlighted ? 'border-orange-200 shadow-orange-100' : 'border-gray-100'
      }`}
    >
      <div className={`h-1 bg-gradient-to-r ${STRIP_COLORS[stripKey]}`} />

      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl transition-transform duration-200 group-hover:scale-110">
            {getDishEmoji(dish.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-tight text-gray-900">{dish.name}</h3>
              <span className="shrink-0 text-sm font-black text-orange-500">₹{dish.price}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {dish.restaurant.name}
              {dish.restaurant.rating ? <span className="font-medium text-yellow-500"> · {dish.restaurant.rating}★</span> : null}
              {dish.restaurant.distance != null ? <span> · {dish.restaurant.distance} km</span> : null}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${badge.bg} ${badge.text}`}>
            {badge.emoji} {dish.score}% match
          </span>
        </div>

        <div className="mb-3 space-y-1.5">
          <Bar label="Calories" value={dish.kcal} unit="kcal" pct={calPct} barColor="bg-orange-400" />
          <Bar label="Protein" value={dish.protein} unit="g" pct={protPct} barColor="bg-blue-400" />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip className="border-orange-100 bg-orange-50 text-orange-600">{dish.kcal} kcal</Chip>
          <Chip className="border-blue-100 bg-blue-50 text-blue-600">{dish.protein}g protein</Chip>
          {dish.carbs != null ? <Chip className="border-green-100 bg-green-50 text-green-600">{dish.carbs}g carbs</Chip> : null}
          {dish.fat != null ? <Chip className="border-amber-100 bg-amber-50 text-amber-600">{dish.fat}g fat</Chip> : null}
        </div>

        <div className="mb-3 space-y-1">
          <p className="text-xs text-gray-400">Source: {dish.source}</p>
          {dish.fallbackDisclaimer ? (
            <p className="text-[11px] text-amber-600">Macros estimated from web. May vary.</p>
          ) : null}
        </div>

        <a
          href={swiggyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-center text-xs font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-orange-400 hover:to-amber-400 hover:shadow-orange-300"
        >
          Order on Swiggy ↗
        </a>
      </div>
    </div>
  );
}

function Bar({ label, value, unit, pct, barColor }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 text-gray-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`${barColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right font-semibold text-gray-600">
        {value} {unit}
      </span>
    </div>
  );
}

function Chip({ children, className }) {
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}
