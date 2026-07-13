// Mock Swiggy MCP transport.
//
// Returns canned data shaped to the *documented* Swiggy Food schema so the whole app runs
// end-to-end without OAuth. Each method returns the inner `data` payload (the httpTransport
// unwraps Swiggy's { success, data } envelope before handing it to the normalizers, so the
// mock mirrors that — it returns `data` directly).
//
// These field names are a best-effort read of the docs; confirm exact names against real
// sample responses when the live transport is wired, then adjust the normalizers once.

// Field names below mirror real captured responses (2026-07): addresses use addressTag/
// addressLine; restaurants use avgRating/costForTwo(string)/imageUrl/etc.
const MOCK_ADDRESSES = [
  { id: 'addr_home', addressTag: 'Home', addressLine: 'Aradhana: 4th Block, Koramangala, Bengaluru 560034', phoneNumber: '****6614', addressCategory: 'Other' },
  { id: 'addr_work', addressTag: 'Work', addressLine: 'Indiranagar 100ft Rd, Bengaluru 560038', phoneNumber: '****6614', addressCategory: 'Other' },
];

const MOCK_RESTAURANTS = [
  { id: '304651', name: 'Chowman (Ad)', cuisines: ['Chinese', 'Asian', 'Thai'], avgRating: 4.5, totalRatings: '18K+', costForTwo: '₹700 for two', areaName: 'Tollygunge', distanceKm: 0.9, deliveryTimeMinutes: 22, deliveryTimeRange: '20-25 MINS', offer: '70% OFF UPTO ₹130', imageUrl: 'https://media-assets.swiggy.com/swiggy/image/upload/mock1.jpg', availabilityStatus: 'OPEN' },
  { id: '1148149', name: 'Chinese Wok (Ad)', cuisines: ['Chinese', 'Asian', 'Tibetan'], avgRating: 4.5, totalRatings: '696', costForTwo: '₹250 for two', areaName: 'Deshopriya Park', distanceKm: 2, deliveryTimeMinutes: 25, deliveryTimeRange: '25-30 MINS', offer: '70% OFF UPTO ₹140', imageUrl: 'https://media-assets.swiggy.com/swiggy/image/upload/mock2.jpg', availabilityStatus: 'OPEN' },
  { id: '1380928', name: 'Wow! Momo (Ad)', cuisines: ['Momos', 'Chinese', 'fastfood'], avgRating: 4.6, totalRatings: '41', costForTwo: '₹300 for two', areaName: 'Tollygunge', distanceKm: 2.4, deliveryTimeMinutes: 18, deliveryTimeRange: '15-20 MINS', offer: 'ITEMS AT ₹69', imageUrl: 'https://media-assets.swiggy.com/swiggy/image/upload/mock3.jpg', availabilityStatus: 'OPEN' },
  { id: 'r_punjab', name: 'Punjab Grill', cuisines: ['North Indian', 'Tandoori'], avgRating: 4.1, totalRatings: '2.1K+', costForTwo: '₹450 for two', areaName: 'Koramangala', distanceKm: 0.8, deliveryTimeMinutes: 28, deliveryTimeRange: '25-30 MINS', offer: '50% OFF', imageUrl: 'https://media-assets.swiggy.com/swiggy/image/upload/mock4.jpg', availabilityStatus: 'OPEN' },
  { id: 'r_dakshin', name: 'Dakshin', cuisines: ['South Indian'], avgRating: 4.2, totalRatings: '5K+', costForTwo: '₹300 for two', areaName: 'Indiranagar', distanceKm: 1.6, deliveryTimeMinutes: 30, deliveryTimeRange: '30-35 MINS', offer: '₹75 OFF ABOVE ₹299', imageUrl: 'https://media-assets.swiggy.com/swiggy/image/upload/mock5.jpg', availabilityStatus: 'OPEN' },
];

// Dishes tied to the mock restaurants above (id/cuisines/rating/distance carried onto each dish
// so dish-centric ranking + enrichment can be exercised without OAuth).
const MOCK_DISHES = [
  { id: 'm_noodveg', name: 'Veg Hakka Noodles', price: 180, isVeg: true, restaurantId: '1148149', restaurantName: 'Chinese Wok', rating: 4.5, distanceKm: 2, cuisines: ['Chinese', 'Asian', 'Tibetan'], imageUrl: '' },
  { id: 'm_noodchk', name: 'Chicken Hakka Noodles', price: 220, isVeg: false, restaurantId: '1148149', restaurantName: 'Chinese Wok', rating: 4.5, distanceKm: 2, cuisines: ['Chinese', 'Asian', 'Tibetan'], imageUrl: '' },
  { id: 'm_manch', name: 'Veg Manchurian', price: 190, isVeg: true, restaurantId: '1148149', restaurantName: 'Chinese Wok', rating: 4.5, distanceKm: 2, cuisines: ['Chinese', 'Asian'], imageUrl: '' },
  { id: 'm_frice', name: 'Chicken Fried Rice', price: 260, isVeg: false, restaurantId: '304651', restaurantName: 'Chowman', rating: 4.5, distanceKm: 0.9, cuisines: ['Chinese', 'Asian', 'Thai'], imageUrl: '' },
  { id: 'm_chilpan', name: 'Chilli Paneer', price: 280, isVeg: true, restaurantId: '304651', restaurantName: 'Chowman', rating: 4.5, distanceKm: 0.9, cuisines: ['Chinese', 'Asian'], imageUrl: '' },
  { id: 'm_momoveg', name: 'Veg Steamed Momo', price: 130, isVeg: true, restaurantId: '1380928', restaurantName: 'Wow! Momo', rating: 4.6, distanceKm: 2.4, cuisines: ['Momos', 'Chinese'], imageUrl: '' },
  { id: 'm_momochk', name: 'Chicken Momo', price: 160, isVeg: false, restaurantId: '1380928', restaurantName: 'Wow! Momo', rating: 4.6, distanceKm: 2.4, cuisines: ['Momos', 'Chinese'], imageUrl: '' },
  { id: 'm_pbm', name: 'Paneer Butter Masala', price: 250, isVeg: true, restaurantId: 'r_punjab', restaurantName: 'Punjab Grill', rating: 4.1, distanceKm: 0.8, cuisines: ['North Indian', 'Tandoori'], imageUrl: '' },
  { id: 'm_bchk', name: 'Butter Chicken', price: 280, isVeg: false, restaurantId: 'r_punjab', restaurantName: 'Punjab Grill', rating: 4.1, distanceKm: 0.8, cuisines: ['North Indian'], imageUrl: '' },
  { id: 'm_dosa', name: 'Masala Dosa', price: 120, isVeg: true, restaurantId: 'r_dakshin', restaurantName: 'Dakshin', rating: 4.2, distanceKm: 1.6, cuisines: ['South Indian'], imageUrl: '' },
];

// A small past-order history that references some mock dishes/restaurants, so the reorder boost
// and "Order again" strip are visible in mock mode.
const MOCK_ORDERS = [
  { orderId: 'o1', restaurantId: '1148149', restaurantName: 'Chinese Wok', orderedAt: '2026-06-30' },
  { orderId: 'o2', restaurantId: 'r_punjab', restaurantName: 'Punjab Grill', orderedAt: '2026-06-22' },
  { orderId: 'o3', restaurantId: '1148149', restaurantName: 'Chinese Wok', orderedAt: '2026-06-10' },
];
const MOCK_ORDER_DETAILS = {
  o1: { orderId: 'o1', restaurantId: '1148149', restaurantName: 'Chinese Wok', cuisines: ['Chinese', 'Asian', 'Tibetan'], orderedAt: '2026-06-30', items: [{ name: 'Veg Hakka Noodles', itemId: 'm_noodveg', price: 180, quantity: 1 }] },
  o2: { orderId: 'o2', restaurantId: 'r_punjab', restaurantName: 'Punjab Grill', cuisines: ['North Indian', 'Tandoori'], orderedAt: '2026-06-22', items: [{ name: 'Paneer Butter Masala', itemId: 'm_pbm', price: 250, quantity: 1 }] },
  o3: { orderId: 'o3', restaurantId: '1148149', restaurantName: 'Chinese Wok', cuisines: ['Chinese', 'Asian'], orderedAt: '2026-06-10', items: [{ name: 'Veg Hakka Noodles', itemId: 'm_noodveg', price: 180, quantity: 1 }] },
};

function matchesQuery(r, query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return true;
  return (
    r.name.toLowerCase().includes(q) ||
    (r.cuisines || []).some((c) => c.toLowerCase().includes(q) || q.includes(c.toLowerCase()))
  );
}

export function createMockTransport() {
  return {
    async callTool(name, args = {}) {
      switch (name) {
        case 'get_addresses':
          return {
            addresses: MOCK_ADDRESSES,
            total: MOCK_ADDRESSES.length,
            pagination: { page: 1, pageSize: 10, total: MOCK_ADDRESSES.length, totalPages: 1, hasMore: false },
          };

        case 'search_restaurants': {
          const q = (args.query || '').toLowerCase().trim();
          const restaurants = MOCK_RESTAURANTS.filter(
            (r) =>
              matchesQuery(r, args.query) ||
              MOCK_DISHES.some((d) => String(d.restaurantId) === String(r.id) && d.name.toLowerCase().includes(q))
          );
          return { restaurants, total: restaurants.length, query: args.query || '' };
        }

        case 'search_menu': {
          const vegOnly = args.vegFilter === 1;
          const dishes = MOCK_DISHES.filter(
            (d) => matchesQuery(d, args.query) && (!vegOnly || d.isVeg)
          );
          return { dishes, total: dishes.length, query: args.query || '' };
        }

        case 'get_restaurant_menu': {
          // Shape mirrors the real get_restaurant_menu items (isVeg present only on veg items,
          // rating as a string, menu_item_id).
          const items = MOCK_DISHES.filter((d) => String(d.restaurantId) === String(args.restaurantId)).map((d) => ({
            name: d.name,
            price: d.price,
            ...(d.isVeg ? { isVeg: true } : {}),
            menu_item_id: d.id,
            imageUrl: d.imageUrl || '',
            rating: String(d.rating ?? ''),
            inStock: 1,
          }));
          return { items, total: items.length };
        }

        case 'get_food_orders':
          return { orders: MOCK_ORDERS.slice(0, args.orderCount || 20), total: MOCK_ORDERS.length };

        case 'get_food_order_details':
          return { order: MOCK_ORDER_DETAILS[args.orderId] || { orderId: args.orderId, items: [] } };

        default:
          throw new Error(`MockTransport: unhandled tool "${name}"`);
      }
    },

    async close() {
      /* no-op for mock */
    },
  };
}
