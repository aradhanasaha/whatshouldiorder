// Internal dish dictionary — deterministic, instant, no LLM.
//
// Some cravings map to restaurants that sell far more than the craving (a sweet shop lists
// idli/dosa; a bakery lists sandwiches). When a craving is a DISH CATEGORY whose label isn't the
// word in dish names (e.g. "Desserts"), we keep only dishes whose name contains a category
// keyword. Single-word categories (Biryani, Pizza, Salad, Rolls) don't need this — the caller's
// name-contains-craving narrowing already handles them.

export const DISH_KEYWORDS = {
  desserts: [
    // western / bakery / cafe
    'cake', 'pastry', 'brownie', 'blondie', 'cookie', 'biscuit', 'ice cream', 'icecream', 'gelato',
    'donut', 'doughnut', 'cheesecake', 'cheese cake', 'mousse', 'tart', 'cupcake', 'muffin', 'waffle',
    'pancake', 'crepe', 'pudding', 'tiramisu', 'macaron', 'macaroon', 'truffle', 'chocolate', 'choco',
    'lava', 'custard', 'panna cotta', 'baklava', 'eclair', 'danish', 'red velvet', 'sundae', 'milkshake',
    'thickshake', 'fudge', 'pie', 'cinnamon roll', 'bento', 'jar', 'dessert', 'sweet', 'candy', 'toffee',
    // indian mithai
    'mithai', 'mishti', 'sandesh', 'rasgulla', 'rosogolla', 'rasmalai', 'gulab jamun', 'jalebi', 'imarti',
    'halwa', 'laddu', 'ladoo', 'barfi', 'burfi', 'peda', 'soan papdi', 'kulfi', 'falooda', 'rabri', 'kheer',
  ],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * If `craving` has a dictionary entry, return the dishes whose name contains a category keyword
 * as a WHOLE WORD (so "tart" doesn't match "starter", "cake" doesn't match "cheesecake" — that's
 * a separate keyword). May be empty. Otherwise return null so the caller keeps default behavior.
 */
export function filterByDishCategory(dishes, craving) {
  const kw = DISH_KEYWORDS[String(craving || '').toLowerCase().trim()];
  if (!kw) return null;
  const res = kw.map((k) => new RegExp(`\\b${escapeRe(k)}\\b`, 'i'));
  return dishes.filter((d) => {
    const n = d.name || '';
    return res.some((re) => re.test(n));
  });
}
