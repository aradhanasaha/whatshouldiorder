import { useState } from 'react';

const CUISINE_PRESETS = [
  'Chinese', 'North Indian', 'South Indian', 'Biryani', 'Pizza', 'Healthy', 'Rolls', 'Desserts',
];

function DarkSlider({ value, min, max, step = 1, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={onChange}
      className="dark-slider w-full"
      style={{ '--pct': `${pct}%` }}
    />
  );
}

export default function InputScreen({
  addresses,
  addressesLoading,
  addressesError,
  selectedAddressId,
  onSelectAddress,
  onReloadAddresses,
  onSearch,
  searching,
}) {
  const [cuisine, setCuisine] = useState('Chinese');
  const [budget, setBudget] = useState(500);

  const canSearch = !searching && Boolean(selectedAddressId) && cuisine.trim().length > 0;

  const handleSearch = () => {
    if (!canSearch) return;
    onSearch({ addressId: selectedAddressId, cuisine: cuisine.trim(), budget });
  };

  return (
    <div className="flex flex-col min-h-full px-5 py-5 gap-6">
      {/* Branding */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-white font-black text-xl tracking-tight leading-tight">What Should I Order?</h1>
          <p className="text-gray-600 text-xs mt-0.5">Live on Swiggy · cuisine · budget</p>
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {/* Delivery address */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">
          Deliver to
        </label>

        {addressesLoading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-500">
            Loading your Swiggy addresses…
          </div>
        ) : addressesError ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-amber-400 leading-relaxed">{addressesError}</p>
            <button
              onClick={onReloadAddresses}
              className="mt-2 text-xs font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedAddressId || ''}
              onChange={(e) => onSelectAddress(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/60 appearance-none cursor-pointer"
            >
              {addresses.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#1a1a22]">
                  {a.label} — {shorten(a.address)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
          </div>
        )}
      </div>

      <div className="h-px bg-white/5" />

      {/* Cuisine */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">
          Craving
        </label>
        <input
          type="text"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          placeholder="Cuisine or dish (e.g. Biryani)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-orange-500/50 transition-colors mb-2.5"
        />
        <div className="flex flex-wrap gap-1.5">
          {CUISINE_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all ${
                cuisine.toLowerCase() === c.toLowerCase()
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <div className="flex justify-between items-baseline mb-2.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget · cost for two</label>
          <span className="font-bold text-base text-green-400">₹{budget}</span>
        </div>
        <DarkSlider value={budget} min={150} max={1500} step={50} onChange={(e) => setBudget(+e.target.value)} />
        <div className="flex justify-between text-xs text-gray-700 mt-1.5">
          <span>₹150</span>
          <span>₹1500</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* CTA */}
      <button
        onClick={handleSearch}
        disabled={!canSearch}
        className={`w-full py-4 rounded-xl font-black text-sm tracking-wide transition-all duration-200 ${
          canSearch
            ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0'
            : 'bg-white/5 text-gray-600 cursor-not-allowed'
        }`}
      >
        {searching ? '⏳ Finding…' : 'Find Restaurants →'}
      </button>
    </div>
  );
}

function shorten(address, max = 42) {
  if (!address) return '';
  return address.length > max ? `${address.slice(0, max).trim()}…` : address;
}
