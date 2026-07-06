import { useCallback, useEffect, useState } from 'react';
import InputScreen from './components/InputScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import { discover, fetchAddresses } from './utils/swiggy.js';

export default function App() {
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');

  const [status, setStatus] = useState('idle'); // idle | loading | done
  const [restaurants, setRestaurants] = useState([]);
  const [query, setQuery] = useState('');
  const [loadingPhase, setLoadingPhase] = useState('');
  const [apiWarning, setApiWarning] = useState('');
  const [mode, setMode] = useState('mock'); // 'mock' | 'shared-local'
  const [showDemoNote, setShowDemoNote] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError('');
    try {
      const res = await fetchAddresses();
      if (res.mode) setMode(res.mode);

      if (res.status === 401) {
        setAddressesError('Not signed in to Swiggy MCP. Showing sample addresses only.');
      } else if (!res.ok) {
        setAddressesError(res.error || 'Could not load your Swiggy addresses.');
      }

      setAddresses(res.addresses);
      if (res.addresses.length) setSelectedAddressId(res.addresses[0].id);
    } catch {
      setAddressesError('Could not reach the address service.');
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleSearch = useCallback(async ({ addressId, cuisine, budget }) => {
    setStatus('loading');
    setRestaurants([]);
    setQuery(cuisine);
    setApiWarning('');
    setMobileSidebarOpen(false);
    setLoadingPhase('Finding restaurants on Swiggy…');

    try {
      const res = await discover({ addressId, cuisine, budget });
      if (res.mode) setMode(res.mode);

      if (!res.ok) {
        setApiWarning(res.error || 'Discovery failed. Adjust your search and retry.');
        setRestaurants([]);
      } else {
        setRestaurants(res.restaurants);
        setLoadingPhase(res.restaurants.length ? 'Results are ready.' : 'No restaurants found.');
      }
    } catch {
      setApiWarning('Something went wrong while searching. Try again.');
    } finally {
      setStatus('done');
    }
  }, []);

  const isMock = mode === 'mock';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside
        className={`
          ${mobileSidebarOpen ? 'flex' : 'hidden'} md:flex
          w-full md:w-[340px] xl:w-[380px] flex-shrink-0
          flex-col overflow-y-auto bg-[#0c0c11]
        `}
      >
        <InputScreen
          addresses={addresses}
          addressesLoading={addressesLoading}
          addressesError={addressesError}
          selectedAddressId={selectedAddressId}
          onSelectAddress={setSelectedAddressId}
          onReloadAddresses={loadAddresses}
          onSearch={handleSearch}
          searching={status === 'loading'}
        />
      </aside>

      <main className={`${!mobileSidebarOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-y-auto relative`}>
        <div className="absolute right-3 top-3 z-20">
          <button
            onClick={() => setShowDemoNote((c) => !c)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="About this demo"
            title="About this demo"
          >
            i
          </button>

          {showDemoNote ? (
            <div className="mt-2 w-[290px] rounded-2xl border border-sky-100 bg-white p-4 text-left shadow-xl shadow-sky-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">About this build</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Restaurant discovery, menus and prices come live from <strong>Swiggy MCP</strong> against your own
                saved addresses. Ordering hands off to Swiggy via deep link today; native in-app cart &amp; checkout
                (<code>update_food_cart</code> / <code>place_food_order</code>) is the next step. Macro-matching returns
                as a phase-2 layer on top of the live menu data.
              </p>
            </div>
          ) : null}
        </div>

        {isMock && status !== 'idle' && (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
            Swiggy MCP is unavailable (not signed in) — showing <strong>sample fallback data</strong>, not live results.
          </div>
        )}

        {apiWarning && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
            {apiWarning}
          </div>
        )}

        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="absolute left-3 top-3 z-10 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm hover:bg-gray-50 md:hidden"
        >
          Back to search
        </button>

        {status === 'idle' ? (
          <EmptyState />
        ) : (
          <ResultsScreen
            restaurants={restaurants}
            query={query}
            loadingPhase={loadingPhase}
            isLoading={status === 'loading'}
            mode={mode}
          />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 select-none text-8xl">🍽️</div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-800">What should you order?</h2>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-gray-400">
        Pick a delivery address, a craving, and a budget — we’ll pull matching restaurants live from Swiggy.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {['Live Swiggy data', 'Your saved addresses', 'Budget-aware', 'Real ratings & offers'].map((feature) => (
          <span key={feature} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm">
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}
