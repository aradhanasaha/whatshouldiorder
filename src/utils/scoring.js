export function matchScore(dish, mealTarget) {
  const calDiff = Math.abs(dish.kcal - mealTarget.kcal) / mealTarget.kcal;
  const calScore = Math.max(0, 100 - calDiff * 100);

  const proteinScore =
    dish.protein >= mealTarget.protein
      ? 100
      : (dish.protein / mealTarget.protein) * 100;

  const priceScore =
    dish.price <= mealTarget.budget
      ? 100
      : Math.max(0, 100 - ((dish.price - mealTarget.budget) / mealTarget.budget) * 100);

  return Math.round(calScore * 0.4 + proteinScore * 0.4 + priceScore * 0.2);
}

export function scoreBadge(score) {
  if (score >= 80) return { emoji: '🟢', label: 'Great match', bg: 'bg-green-100', text: 'text-green-700' };
  if (score >= 60) return { emoji: '🟡', label: 'Good match', bg: 'bg-yellow-100', text: 'text-yellow-700' };
  return { emoji: '🟠', label: 'Partial match', bg: 'bg-orange-100', text: 'text-orange-700' };
}

export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}
