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
          const restaurants = MOCK_RESTAURANTS.filter((r) => matchesQuery(r, args.query));
          return { restaurants, total: restaurants.length, query: args.query || '' };
        }

        default:
          throw new Error(`MockTransport: unhandled tool "${name}"`);
      }
    },

    async close() {
      /* no-op for mock */
    },
  };
}
