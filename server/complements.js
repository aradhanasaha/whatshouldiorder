// Complementary-dish engine — deterministic, no LLM (same ethos as ranking.js / dishKeywords.js).
//
// Swiggy's menu category titles are frequently promotional ("Minimum 50% off", "Recommended",
// "IPL Packs") rather than food courses, so we infer a dish's COURSE from its category title when
// that's semantic, and otherwise from the dish name. Then we suggest dishes from courses that
// complement it (a biryani wants a side/drink/dessert, not another biryani).

const COURSE_KEYWORDS = {
  bread: ['naan', 'roti', 'paratha', 'kulcha', 'bread', 'rumali', 'chapati', 'laccha'],
  rice: ['biryani', 'pulao', 'fried rice', 'rice', 'khichdi', 'noodle', 'hakka', 'chowmein', 'pasta', 'ramen'],
  starter: ['starter', 'appetiser', 'appetizer', 'kebab', 'tikka', 'wings', 'momo', 'roll', 'spring roll',
    'manchurian', 'pakora', 'samosa', 'nugget', 'popcorn', 'fry', 'fries', 'crispy', 'chilli', 'satay', 'soup', 'salad'],
  main: ['curry', 'masala', 'gravy', 'butter chicken', 'korma', 'handi', 'kadai', 'dal', 'paneer', 'thali',
    'combo', 'meal', 'bowl', 'burger', 'pizza', 'sandwich', 'wrap', 'main course'],
  side: ['side', 'raita', 'salan', 'chutney', 'dip', 'papad', 'sauce', 'extra', 'add on', 'addon', 'combo'],
  dessert: ['dessert', 'sweet', 'cake', 'brownie', 'ice cream', 'gulab jamun', 'rasmalai', 'kheer', 'halwa',
    'mousse', 'pastry', 'cookie', 'lava', 'phirni', 'kulfi', 'jalebi'],
  beverage: ['beverage', 'drink', 'coke', 'pepsi', 'sprite', 'thums', 'soda', 'juice', 'lassi', 'shake',
    'water', 'tea', 'coffee', 'mojito', 'iced tea', 'smoothie', 'buttermilk'],
};

// What pairs well with what. Order matters — earlier courses are preferred suggestions.
const COURSE_PAIRS = {
  rice: ['side', 'starter', 'beverage', 'dessert'],
  main: ['bread', 'rice', 'side', 'starter', 'beverage', 'dessert'],
  bread: ['main', 'side', 'beverage'],
  starter: ['main', 'rice', 'bread', 'beverage'],
  side: ['main', 'rice', 'starter'],
  dessert: ['main', 'rice', 'starter'],
  beverage: ['main', 'rice', 'starter', 'dessert'],
  unknown: ['beverage', 'dessert', 'side', 'starter'],
};

const norm = (s) => String(s || '').toLowerCase();

/**
 * Course implied by a category title alone ('unknown' for promotional titles like
 * "Recommended" / "Minimum 50% off"). Used to pick the most meaningful duplicate.
 */
export function courseFromCategory(category) {
  const cat = norm(category);
  if (!cat) return 'unknown';
  for (const [course, words] of Object.entries(COURSE_KEYWORDS)) {
    if (words.some((w) => cat.includes(w))) return course;
  }
  return 'unknown';
}

/** Course from the category title if it's semantic, else from the dish name. */
export function inferCourse(dish) {
  const fromCat = courseFromCategory(dish.category);
  if (fromCat !== 'unknown') return fromCat;
  const name = norm(dish.name);
  for (const [course, words] of Object.entries(COURSE_KEYWORDS)) {
    if (words.some((w) => name.includes(w))) return course;
  }
  return 'unknown';
}

/**
 * Suggest dishes from the same restaurant that complete the order.
 * @param menu      full normalized menu (getRestaurantMenu output)
 * @param added     the dish just added
 * @param options   { veg: 'all'|'veg'|'non-veg', excludeIds: string[], limit }
 */
export function pickComplements(menu = [], added = {}, { veg = 'all', excludeIds = [], limit = 8 } = {}) {
  const skip = new Set([String(added.id), ...excludeIds.map(String)]);

  const eligible = menu.filter((d) => {
    if (skip.has(String(d.id))) return false;
    if (!d.inStock) return false;
    if (d.price == null) return false;
    if (veg === 'veg' && d.isVeg !== true) return false;
    if (veg === 'non-veg' && d.isVeg === true) return false;
    return true;
  });

  const wanted = COURSE_PAIRS[inferCourse(added)] || COURSE_PAIRS.unknown;
  const byRating = (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (a.price ?? 0) - (b.price ?? 0);

  // Preferred: dishes whose course complements the added dish, in pairing priority order.
  // Cap 2 per course so one course (usually mains) doesn't swallow the whole list.
  const picked = [];
  for (const course of wanted) {
    const inCourse = eligible.filter((d) => !picked.includes(d) && inferCourse(d) === course).sort(byRating);
    picked.push(...inCourse.slice(0, 2));
    if (picked.length >= limit) break;
  }

  // Fallback: if pairing found too little, top up with the restaurant's best-rated other dishes.
  if (picked.length < 3) {
    for (const d of eligible.slice().sort(byRating)) {
      if (!picked.includes(d)) picked.push(d);
      if (picked.length >= limit) break;
    }
  }

  return picked.slice(0, limit).map((d) => ({ ...d, course: inferCourse(d) }));
}
