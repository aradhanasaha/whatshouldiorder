import { useState } from 'react';

const MEAL_PRESETS = [
  { id: 'balanced', label: '⚖️ Balanced', kcal: 2000, protein: 100 },
  { id: 'high_protein', label: '💪 High Protein', kcal: 2000, protein: 160 },
  { id: 'weight_loss', label: '🔥 Weight Loss', kcal: 1500, protein: 130 },
  { id: 'muscle_gain', label: '🏋️ Muscle Gain', kcal: 2500, protein: 190 },
  { id: 'light', label: '🌿 Light & Easy', kcal: 1400, protein: 70 },
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

function SliderRow({ label, value, unit, min, max, step, onChange, valueColor = 'text-orange-400' }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2.5">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
        <span className={`font-bold text-base ${valueColor}`}>
          {typeof value === 'number' && unit === '₹' ? `₹${value}` : `${value}${unit !== '₹' ? ' ' + unit : ''}`}
        </span>
      </div>
      <DarkSlider value={value} min={min} max={max} step={step} onChange={onChange} />
      <div className="flex justify-between text-xs text-gray-700 mt-1.5">
        <span>{unit === '₹' ? `₹${min}` : `${min}${unit}`}</span>
        <span>{unit === '₹' ? `₹${max}` : `${max}${unit}`}</span>
      </div>
    </div>
  );
}

export default function InputScreen({ onSearch, onSettings, searching }) {
  const [meals, setMeals] = useState(1);

  // Single-meal state
  const [singleKcal, setSingleKcal] = useState(450);
  const [singleProtein, setSingleProtein] = useState(30);

  // Multi-meal state
  const [preset, setPreset] = useState('balanced');
  const [dailyKcal, setDailyKcal] = useState(2000);
  const [dailyProtein, setDailyProtein] = useState(100);

  // Common
  const [budget, setBudget] = useState(300);
  const [diet, setDiet] = useState('all');
  const [location, setLocation] = useState({ type: 'none', text: '' });
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Single meal derived
  const proteinKcal = singleProtein * 4;
  const remainingKcal = singleKcal - proteinKcal;
  const proteinError = remainingKcal < 0;
  const carbsG = proteinError ? 0 : Math.round((remainingKcal * 0.55) / 4);
  const fatG = proteinError ? 0 : Math.round((remainingKcal * 0.45) / 9);

  // Multi meal derived
  const perMealKcal = Math.round(dailyKcal / meals);
  const perMealProtein = Math.round(dailyProtein / meals);
  const perMealRem = perMealKcal - perMealProtein * 4;
  const perMealCarbsG = perMealRem > 0 ? Math.round((perMealRem * 0.55) / 4) : 0;
  const perMealFatG = perMealRem > 0 ? Math.round((perMealRem * 0.45) / 9) : 0;

  const handlePreset = (id) => {
    setPreset(id);
    const p = MEAL_PRESETS.find((x) => x.id === id);
    if (p) { setDailyKcal(p.kcal); setDailyProtein(p.protein); }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoError('Not supported by this browser.'); return; }
    setDetecting(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ type: 'gps', lat: pos.coords.latitude, lng: pos.coords.longitude, text: 'GPS Location' });
        setDetecting(false);
      },
      () => { setGeoError('Location denied — type your area below.'); setDetecting(false); }
    );
  };

  const handleSearch = () => {
    if (meals === 1 && proteinError) return;

    const perMeal =
      meals === 1
        ? { kcal: singleKcal, protein: singleProtein, carbs: carbsG, fat: fatG }
        : { kcal: perMealKcal, protein: perMealProtein, carbs: perMealCarbsG, fat: perMealFatG };

    const loc =
      location.type === 'gps'
        ? location
        : location.text.trim()
        ? { type: 'text', text: location.text.trim() }
        : { type: 'default', lat: 12.9716, lng: 77.5946, text: 'Bangalore' };

    onSearch({ meals, perMeal, budget, diet, location: loc });
  };

  const canSearch = !searching && !(meals === 1 && proteinError);

  return (
    <div className="flex flex-col min-h-full px-5 py-5 gap-6">
      {/* Branding */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-white font-black text-xl tracking-tight leading-tight">What Should I Order?</h1>
          <p className="text-gray-600 text-xs mt-0.5">Macro-matched · nearby · budget-aware</p>
        </div>
        <button onClick={onSettings} className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors text-lg" aria-label="Settings">
          ⚙️
        </button>
      </div>

      <div className="h-px bg-white/5" />

      {/* Meal count */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
          Number of Meals
        </label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMeals(n)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                meals === n
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* ── Single meal inputs ── */}
      {meals === 1 ? (
        <div className="space-y-5">
          <SliderRow
            label="Calories per Meal"
            value={singleKcal}
            unit="kcal"
            min={100}
            max={600}
            step={10}
            onChange={(e) => setSingleKcal(+e.target.value)}
            valueColor="text-orange-400"
          />
          <SliderRow
            label="Protein per Meal"
            value={singleProtein}
            unit="g"
            min={5}
            max={50}
            step={1}
            onChange={(e) => setSingleProtein(+e.target.value)}
            valueColor="text-blue-400"
          />

          {/* Auto-calc display */}
          {proteinError ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400 leading-relaxed">
                ⚠️ Protein alone needs <span className="font-bold">{proteinKcal} kcal</span> but your budget is only{' '}
                <span className="font-bold">{singleKcal} kcal</span>. Lower protein or raise calories.
              </p>
            </div>
          ) : (
            <div className="bg-white/4 border border-white/8 rounded-xl px-4 py-3.5">
              <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">
                Remaining {remainingKcal} kcal → auto-split
              </p>
              <div className="space-y-2">
                <MacroLine label="Carbs" value={carbsG} kcal={Math.round(carbsG * 4)} color="text-green-400" />
                <MacroLine label="Fat" value={fatG} kcal={Math.round(fatG * 9)} color="text-yellow-400" />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Multi meal inputs ── */
        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">
              Meal Plan
            </label>
            <div className="relative">
              <select
                value={preset}
                onChange={(e) => handlePreset(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/60 appearance-none cursor-pointer"
              >
                {MEAL_PRESETS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a1a22]">
                    {p.label} — {p.kcal} kcal · {p.protein}g protein
                  </option>
                ))}
                <option value="custom" className="bg-[#1a1a22]">✏️ Custom</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
            </div>
          </div>

          <SliderRow
            label="Daily Calories"
            value={dailyKcal}
            unit="kcal"
            min={1200}
            max={3500}
            step={50}
            onChange={(e) => { setDailyKcal(+e.target.value); setPreset('custom'); }}
            valueColor="text-orange-400"
          />
          <SliderRow
            label="Daily Protein"
            value={dailyProtein}
            unit="g"
            min={40}
            max={200}
            step={5}
            onChange={(e) => { setDailyProtein(+e.target.value); setPreset('custom'); }}
            valueColor="text-blue-400"
          />

          {/* Per-meal breakdown */}
          <div className="bg-white/4 border border-white/8 rounded-xl px-4 py-3.5">
            <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">
              Per meal ({meals} meals)
            </p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <MacroLine label="Calories" value={perMealKcal} unit="kcal" color="text-orange-400" compact />
              <MacroLine label="Protein" value={perMealProtein} unit="g" color="text-blue-400" compact />
              <MacroLine label="Carbs" value={perMealCarbsG} unit="g" color="text-green-400" compact />
              <MacroLine label="Fat" value={perMealFatG} unit="g" color="text-yellow-400" compact />
            </div>
          </div>
        </div>
      )}

      <div className="h-px bg-white/5" />

      {/* Budget */}
      <SliderRow
        label="Budget per Meal"
        value={budget}
        unit="₹"
        min={100}
        max={1000}
        step={50}
        onChange={(e) => setBudget(+e.target.value)}
        valueColor="text-green-400"
      />

      {/* Diet */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">Diet</label>
        <div className="flex gap-1.5">
          {[['all', '🍽️ All'], ['veg', '🥦 Veg'], ['non-veg', '🍗 Non-veg']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDiet(val)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                diet === val
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block">Location</label>
        <button
          onClick={detectLocation}
          disabled={detecting}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all mb-2 border ${
            location.type === 'gps'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-white/10 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-200'
          }`}
        >
          {detecting ? '📡 Detecting…' : location.type === 'gps' ? '✅ GPS detected' : '📍 Detect my location'}
        </button>
        {geoError && <p className="text-xs text-red-400 mb-2">{geoError}</p>}
        <input
          type="text"
          value={location.type === 'gps' ? '' : location.text}
          onChange={(e) => setLocation({ type: 'text', text: e.target.value })}
          disabled={location.type === 'gps'}
          placeholder="Or type area (e.g. Koramangala)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-orange-500/50 disabled:opacity-30 transition-colors"
        />
        {location.type !== 'gps' && !location.text && (
          <p className="text-xs text-gray-700 mt-1.5">No location set — defaults to Bangalore for demo</p>
        )}
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
        {searching ? '⏳ Searching…' : 'Find My Meals →'}
      </button>
    </div>
  );
}

function MacroLine({ label, value, kcal, unit, color, compact }) {
  if (compact) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-xs font-bold ${color}`}>
          {value} {unit}
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-bold ${color}`}>
        {value}g <span className="text-gray-600 font-normal">({kcal} kcal)</span>
      </span>
    </div>
  );
}
