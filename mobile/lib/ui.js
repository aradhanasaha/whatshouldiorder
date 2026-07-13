export const CUISINE_PRESETS = [
  'Chinese', 'North Indian', 'South Indian', 'Biryani', 'Pizza', 'Rolls', 'Desserts', 'Salad',
];

export const DIET_OPTIONS = [
  ['all', '🍽️ All'],
  ['veg', '🥦 Veg'],
  ['non-veg', '🍗 Non-veg'],
];

// Mirrors the web scoreBadge thresholds (scoring.js): >=80 green, >=60 yellow, else orange.
export function scoreBadge(score) {
  if (score >= 80) return { emoji: '🟢', bg: 'bg-green-100', text: 'text-green-700' };
  if (score >= 60) return { emoji: '🟡', bg: 'bg-yellow-100', text: 'text-yellow-700' };
  return { emoji: '🟠', bg: 'bg-orange-100', text: 'text-orange-700' };
}

export function sortDishes(dishes, sort) {
  const list = [...dishes];
  switch (sort) {
    case 'rating':
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'distance':
      return list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    case 'price':
      return list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    default:
      return list; // 'match' — server order
  }
}
